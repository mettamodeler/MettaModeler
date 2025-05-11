import { useCallback, useRef, useState, useMemo, useEffect } from 'react';
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
  NodeTypes,
  EdgeTypes,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FCMModel, FCMNode, FCMEdge, NodeType } from '@/lib/types';
import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Define node and edge types as constants outside of the component
// to prevent unnecessary re-renders
const nodeTypes: NodeTypes = { custom: CustomNode };
const edgeTypes: EdgeTypes = { custom: CustomEdge };

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
      ? getComputedStyle(document.documentElement).getPropertyValue('--edge-positive').trim() || '#3B82F6'
      : getComputedStyle(document.documentElement).getPropertyValue('--edge-negative').trim() || '#EF4444';
    
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
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
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
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  }));
  
  return {
    ...model,
    schemaVersion: "1.0.0",
    id: Number(model.id),
    projectId: Number(model.projectId),
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
      // Prevent node/edge deletion if an input, textarea, or contenteditable is focused
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        (document.activeElement && (document.activeElement as HTMLElement).isContentEditable)
      ) {
        return;
      }
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
      const edgeColor = 'rgba(59, 130, 246, 0.8)'; // blue for positive
      
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
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'custom',
        data: { 
          weight: defaultWeight,
          // Flag whether this is part of a bidirectional connection
          isBidirectional: reverseExists,
          // Indicate this edge's position in bidirectional pair (if applicable)
          isReversePair: reverseExists
        }
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
              ? getComputedStyle(document.documentElement).getPropertyValue('--edge-positive').trim() || '#3B82F6'
              : getComputedStyle(document.documentElement).getPropertyValue('--edge-negative').trim() || '#EF4444';
            
            return {
              ...edge,
              data: {
                ...edge.data,
                weight,
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
    
    // Calculate position based on existing nodes
    let position = { x: 250, y: 250 };
    if (nodes.length > 0) {
      // Find the rightmost node
      const rightmostNode = nodes.reduce((rightmost, node) => 
        node.position.x > rightmost.position.x ? node : rightmost
      );
      // Spawn new node to the right of the rightmost node
      position = {
        x: rightmostNode.position.x + 200,
        y: rightmostNode.position.y
      };
    }
    
    const newNode = {
      id,
      type: 'custom',
      position,
      data: { 
        label: 'New Node', 
        type: 'regular' as NodeType, 
        value: 0.5,
        color: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#A855F7',
        onChange: onNodeLabelChange,
        onTypeChange: onNodeTypeChange,
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
    saveModelChanges();
  }, [setNodes, onNodeLabelChange, onNodeTypeChange, saveModelChanges, nodes]);
  
  // State to track node being hovered over
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  // Find connected nodes and edges for a hovered node
  const getConnectedElements = useCallback((nodeId: string | null) => {
    if (!nodeId) return { connectedNodeIds: [], connectedEdgeIds: [] };
    
    // Find all edges that connect to or from this node
    const connectedEdges = edges.filter(
      edge => edge.source === nodeId || edge.target === nodeId
    );
    
    // Get IDs of connected edges
    const connectedEdgeIds = connectedEdges.map(edge => edge.id);
    
    // Get IDs of connected nodes (the other end of each edge)
    const connectedNodeIds = connectedEdges.map(edge => 
      edge.source === nodeId ? edge.target : edge.source
    );
    
    return { connectedNodeIds, connectedEdgeIds };
  }, [edges]);
  
  // Handle node hover
  const onNodeHover = useCallback((nodeId: string, isHovered: boolean) => {
    setHoveredNodeId(isHovered ? nodeId : null);
  }, []);
  
  // Get connected elements based on hovered node
  const { connectedNodeIds, connectedEdgeIds } = getConnectedElements(hoveredNodeId);
  
  // Update node data (pass callbacks to node and highlight connected nodes)
  const nodesWithCallbacks = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onChange: onNodeLabelChange,
      onTypeChange: onNodeTypeChange,
      onNodeHover,
      isHighlighted: hoveredNodeId ? 
        // Highlight if this node is connected to the hovered node or is the hovered node itself
        (connectedNodeIds.includes(node.id) || node.id === hoveredNodeId) : false,
    },
  }));
  
  // Update edge data (pass callbacks to edge and highlight connected edges)
  const edgesWithCallbacks = edges.map((edge) => ({
    ...edge,
    data: {
      ...edge.data,
      onChange: onEdgeWeightChange,
      isHighlighted: hoveredNodeId ? 
        // Highlight if this edge connects to the hovered node
        (edge.source === hoveredNodeId || edge.target === hoveredNodeId) : false,
    },
  }));
  
  useEffect(() => {
    return () => {
      setNodes([]);
      setEdges([]);
    };
  }, []);
  
  return (
    <ReactFlow
      nodes={nodesWithCallbacks}
      edges={edgesWithCallbacks}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onClick={() => {
        // Close any open edge popups when clicking canvas
        setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, isVisible: false } })));
      }}
      onKeyDown={onKeyDown}
      deleteKeyCode={['Backspace', 'Delete']}
      fitView={nodes.length > 1}
      defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      minZoom={0.2}
      maxZoom={4}
      connectionMode={ConnectionMode.Loose}
      connectionRadius={30} 
      defaultEdgeOptions={{
        type: 'custom'
      }}
      defaultMarkerColor="transparent"
    >
      <svg style={{position: 'absolute', width: 0, height: 0}}>
        <defs>
          <marker
            id="arrowhead-positive"
            markerWidth="12"
            markerHeight="12"
            refX="8"
            refY="6"
            orient="auto"
          >
            <path d="M 0 0 L 12 6 L 0 12 z" fill="rgba(59, 130, 246, 0.8)" />
          </marker>
          <marker
            id="arrowhead-negative"
            markerWidth="12"
            markerHeight="12"
            refX="8"
            refY="6"
            orient="auto"
          >
            <path d="M 0 0 L 12 6 L 0 12 z" fill="rgba(239, 68, 68, 0.8)" />
          </marker>
        </defs>
      </svg>
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
      <div style={{ width: '100%', height: '600px' }}>
        <FCMEditorContent {...props} />
      </div>
    </ReactFlowProvider>
  );
}
