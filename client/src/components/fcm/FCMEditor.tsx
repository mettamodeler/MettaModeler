import { useCallback, useRef, useState, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  Panel,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FCMModel, FCMNode, FCMEdge, NodeType } from '@/lib/types';
import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Custom node types - define outside component to prevent re-creation
const NODE_TYPES = {
  custom: CustomNode,
};

// Custom edge types - define outside component to prevent re-creation
const EDGE_TYPES = {
  custom: CustomEdge,
};

interface FCMEditorProps {
  model: FCMModel;
  onModelUpdate: (model: FCMModel) => void;
}

// Helper to convert from model to ReactFlow format
function modelToReactFlow(model: FCMModel): { nodes: Node[], edges: Edge[] } {
  const nodes = model.nodes.map((node) => ({
    id: node.id,
    type: 'custom',
    position: { x: node.positionX, y: node.positionY },
    data: { 
      label: node.label, 
      type: node.type, 
      value: node.value,
      color: node.color 
    },
  }));
  
  // First identify bidirectional edges
  // We'll create a map of source-target pairs to find reverse connections
  const connectionMap = new Map();
  
  // First pass: record all connections
  model.edges.forEach(edge => {
    const forward = `${edge.source}->${edge.target}`;
    const reverse = `${edge.target}->${edge.source}`;
    connectionMap.set(forward, true);
    
    // Mark if there's a reverse connection
    if (connectionMap.has(reverse)) {
      connectionMap.set(reverse, 'bidirectional');
      connectionMap.set(forward, 'bidirectional');
    }
  });
  
  // Second pass: create edges with bidirectional flags
  const edges = model.edges.map((edge) => {
    // Determine edge color based on weight
    const edgeColor = edge.weight >= 0 
      ? 'rgba(239, 68, 68, 0.8)' // red for positive
      : 'rgba(59, 130, 246, 0.8)'; // blue for negative
    
    // Check if this edge is part of a bidirectional pair
    const connectionKey = `${edge.source}->${edge.target}`;
    const isBidirectional = connectionMap.get(connectionKey) === 'bidirectional';
    
    // For bidirectional pairs, alternate which one gets the isReversePair flag
    // We use a simple string comparison to consistently decide which edge is "first"
    const isReversePair = isBidirectional && edge.source > edge.target;
    
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'custom',
      data: { 
        weight: edge.weight,
        isBidirectional,
        isReversePair
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: edgeColor,
      },
    };
  });
  
  return { nodes, edges };
}

// Helper to convert from ReactFlow format back to model
function reactFlowToModel(
  model: FCMModel, 
  nodes: Node[], 
  edges: Edge[]
): FCMModel {
  const updatedNodes = nodes.map((node) => {
    const position = node.position;
    return {
      id: node.id,
      label: node.data.label,
      type: node.data.type as NodeType,
      value: node.data.value,
      positionX: position.x,
      positionY: position.y,
      color: node.data.color,
    };
  });
  
  const updatedEdges = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    weight: edge.data?.weight || 0,
  }));
  
  return {
    ...model,
    nodes: updatedNodes as FCMNode[],
    edges: updatedEdges as FCMEdge[],
  };
}

function FCMEditorContent({ model, onModelUpdate }: FCMEditorProps) {
  const { toast } = useToast();
  
  const { nodes: initialNodes, edges: initialEdges } = modelToReactFlow(model);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Helper to save model changes with debounce
  const saveModelChanges = useCallback(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
    
    const timeout = setTimeout(async () => {
      try {
        const updatedModel = reactFlowToModel(model, nodes, edges);
        
        // Save to API
        await apiRequest('PUT', `/api/models/${model.id}`, updatedModel);
        
        // Update local state
        onModelUpdate(updatedModel);
        
        // toast.success('Model saved');
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to save model",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }, 1000);
    
    setSaveTimeout(timeout);
  }, [model, nodes, edges, onModelUpdate, saveTimeout, toast]);
  
  // Handle node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      saveModelChanges();
    },
    [onNodesChange, saveModelChanges]
  );
  
  // Handle node deletion with keyboard
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.filter(node => node.selected);
        const selectedEdges = edges.filter(edge => edge.selected);
        
        if (selectedNodes.length > 0) {
          setNodes(nodes.filter(node => !node.selected));
          // Remove connected edges
          setEdges(edges.filter(edge => 
            !selectedNodes.some(node => 
              node.id === edge.source || node.id === edge.target
            )
          ));
          saveModelChanges();
        }
        
        if (selectedEdges.length > 0) {
          setEdges(edges.filter(edge => !edge.selected));
          saveModelChanges();
        }
      }
    },
    [nodes, edges, setNodes, setEdges, saveModelChanges]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      saveModelChanges();
    },
    [onEdgesChange, saveModelChanges]
  );
  
  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      
      // Default weight for new connections
      const defaultWeight = 0.5;
      
      // Determine color based on weight (positive by default)
      const edgeColor = 'rgba(239, 68, 68, 0.8)'; // red for positive
      
      // Check if there's already a connection in the reverse direction (for bidirectional edges)
      // We need to find any edge where source and target are reversed
      const reverseExists = edges.some(
        edge => edge.source === connection.target && edge.target === connection.source
      );
      
      // Generate a unique ID based on source and target
      const edgeId = `${connection.source}-${connection.target}`;
      
      // Create a new edge with default weight
      const newEdge = {
        id: edgeId,
        source: connection.source,
        target: connection.target,
        type: 'custom',
        data: { 
          weight: defaultWeight,
          // Flag whether this is part of a bidirectional connection
          isBidirectional: reverseExists,
          // Indicate this edge's position in bidirectional pair (if applicable)
          isReversePair: reverseExists
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: edgeColor,
        },
      };
      
      // If this is a bidirectional connection, update the existing reverse edge too
      if (reverseExists) {
        setEdges(eds => 
          eds.map(edge => {
            if (edge.source === connection.target && edge.target === connection.source) {
              // Update the reverse edge to indicate it's bidirectional
              return {
                ...edge,
                data: {
                  ...edge.data,
                  isBidirectional: true,
                  isReversePair: false
                }
              };
            }
            return edge;
          })
        );
      }
      
      setEdges((eds) => addEdge(newEdge, eds));
      saveModelChanges();
    },
    [edges, setEdges, saveModelChanges]
  );
  
  // Handle node label updates
  const onNodeLabelChange = useCallback(
    (id: string, label: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                label,
              },
            };
          }
          return node;
        })
      );
      saveModelChanges();
    },
    [setNodes, saveModelChanges]
  );
  
  // Handle node type updates
  const onNodeTypeChange = useCallback(
    (id: string, type: NodeType) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            // Change color based on type
            const color = type === 'driver' ? '#00C4FF' : '#A855F7';
            
            return {
              ...node,
              data: {
                ...node.data,
                type,
                color,
              },
            };
          }
          return node;
        })
      );
      saveModelChanges();
    },
    [setNodes, saveModelChanges]
  );
  
  // Handle edge weight updates
  const onEdgeWeightChange = useCallback(
    (id: string, weight: number) => {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === id) {
            // Determine color based on updated weight
            const edgeColor = weight >= 0 
              ? 'rgba(239, 68, 68, 0.8)' // red for positive
              : 'rgba(59, 130, 246, 0.8)'; // blue for negative
            
            return {
              ...edge,
              data: {
                ...edge.data,
                weight,
              },
              // Update marker color
              // @ts-ignore
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: edgeColor,
                width: 20,
                height: 20,
              }
            };
          }
          return edge;
        })
      );
      saveModelChanges();
    },
    [setEdges, saveModelChanges]
  );
  
  // Create a new node
  const onAddNode = useCallback(() => {
    const id = `node-${Date.now()}`;
    const newNode = {
      id,
      type: 'custom',
      position: { x: 250, y: 250 },
      data: { 
        label: 'New Node', 
        type: 'regular' as NodeType, 
        value: 0.5,
        color: '#A855F7',
        onChange: onNodeLabelChange,
        onTypeChange: onNodeTypeChange,
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
    saveModelChanges();
  }, [setNodes, onNodeLabelChange, onNodeTypeChange, saveModelChanges]);
  
  // Update node data (pass callbacks to node)
  const nodesWithCallbacks = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onChange: onNodeLabelChange,
      onTypeChange: onNodeTypeChange,
    },
  }));
  
  // Update edge data (pass callbacks to edge)
  const edgesWithCallbacks = edges.map((edge) => ({
    ...edge,
    data: {
      ...edge.data,
      onChange: onEdgeWeightChange,
    },
  }));
  
  return (
    <ReactFlow
      nodes={nodesWithCallbacks}
      edges={edgesWithCallbacks}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={onConnect}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      onClick={() => {
        // Close any open edge popups when clicking canvas
        setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, isVisible: false } })));
      }}
      onKeyDown={onKeyDown}
      deleteKeyCode={['Backspace', 'Delete']}
      fitView
      minZoom={0.2}
      maxZoom={4}
    >
      <Background color="#ffffff" gap={16} size={1} />
      <Controls className="dark-glass" />
      <MiniMap 
        nodeColor={(n) => {
          return n.data?.color || '#A855F7';
        }}
        maskColor="rgba(30, 42, 68, 0.8)"
        className="dark-glass"
      />
      
      <Panel position="top-right" className="dark-glass rounded-lg shadow-glow-sm p-1 flex flex-col space-y-1">
        <button 
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
          onClick={onAddNode}
          title="Add Node"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </Panel>
    </ReactFlow>
  );
}

// Wrap with provider to handle react-flow context
export default function FCMEditor(props: FCMEditorProps) {
  return (
    <ReactFlowProvider>
      <FCMEditorContent {...props} />
    </ReactFlowProvider>
  );
}
