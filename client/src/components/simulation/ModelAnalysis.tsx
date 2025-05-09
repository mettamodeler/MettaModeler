import { useState, useEffect } from 'react';
import { FCMModel } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ModelAnalysisProps {
  model: FCMModel;
}

interface NetworkAnalysis {
  nodeCount: number;
  edgeCount: number;
  density: number;
  isConnected: boolean;
  hasLoop: boolean;
  centrality: {
    degree: Record<string, number>;
    inDegree: Record<string, number>;
    outDegree: Record<string, number>;
    betweenness: Record<string, number>;
    closeness: Record<string, number>;
  };
  adjacencyMatrix: number[][];
  nodeIds: string[];
}

export default function ModelAnalysis({ model }: ModelAnalysisProps) {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<NetworkAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Guard: If model or model.nodes is missing or empty, show friendly message and do not run analysis or effects
  if (!model || !model.nodes || model.nodes.length === 0) {
    return (
      <Card className="card h-full">
        <CardHeader>
          <CardTitle>model analysis</CardTitle>
          <CardDescription>Add nodes to your model to see analysis results.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="nested-panel p-6 rounded-lg text-center text-[hsl(var(--muted-foreground))]">
            <p>Your model needs nodes before analysis can be performed.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  useEffect(() => {
    // Only analyze if we have nodes and edges
    if (model.nodes.length > 0) {
      analyzeModel();
    }
  }, [model]);
  
  const analyzeModel = async () => {
    setLoading(true);
    
    try {
      // Format the data for the Python backend
      const data = {
        nodes: model.nodes.map(node => ({
          id: node.id,
          value: node.value,
          type: node.type,
          label: node.label
        })),
        edges: model.edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          weight: edge.weight
        }))
      };
      
      // Call the Python analysis endpoint
      const result = await apiRequest('POST', '/api/analyze', data);
      setAnalysis(result as NetworkAnalysis);
    } catch (error) {
      // If Python service fails, do a basic local analysis
      const basicAnalysis = performBasicAnalysis(model);
      setAnalysis(basicAnalysis);
      
      toast({
        variant: "destructive",
        title: "Advanced Analysis Failed",
        description: "Using basic analysis instead. Check if Python service is running.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Basic fallback analysis if Python service is not available
  const performBasicAnalysis = (model: FCMModel): NetworkAnalysis => {
    const nodeCount = model.nodes.length;
    const edgeCount = model.edges.length;
    
    // Calculate density (edges / max possible edges)
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    const density = maxPossibleEdges === 0 ? 0 : edgeCount / maxPossibleEdges;
    
    // Check for loops (edges that point back to source)
    const hasLoop = model.edges.some(edge => edge.source === edge.target);
    
    // Simple in/out degree calculation
    const inDegree: Record<string, number> = {};
    const outDegree: Record<string, number> = {};
    const degree: Record<string, number> = {};
    
    // Initialize with zeros
    model.nodes.forEach(node => {
      inDegree[node.id] = 0;
      outDegree[node.id] = 0;
      degree[node.id] = 0;
    });
    
    // Count in and out degrees
    model.edges.forEach(edge => {
      outDegree[edge.source] = (outDegree[edge.source] || 0) + 1;
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    });
    
    // Calculate total degree
    model.nodes.forEach(node => {
      degree[node.id] = (inDegree[node.id] || 0) + (outDegree[node.id] || 0);
    });
    
    // Create a simple adjacency matrix
    const nodeIds = model.nodes.map(node => node.id);
    const nodeIdMap: Record<string, number> = {};
    nodeIds.forEach((id, index) => {
      nodeIdMap[id] = index;
    });
    
    const adjacencyMatrix = Array(nodeCount).fill(0).map(() => Array(nodeCount).fill(0));
    
    model.edges.forEach(edge => {
      const sourceIdx = nodeIdMap[edge.source];
      const targetIdx = nodeIdMap[edge.target];
      if (sourceIdx !== undefined && targetIdx !== undefined) {
        adjacencyMatrix[sourceIdx][targetIdx] = edge.weight;
      }
    });
    
    // Return a basic analysis object
    return {
      nodeCount,
      edgeCount,
      density,
      isConnected: false, // Requires more complex graph traversal
      hasLoop,
      centrality: {
        degree,
        inDegree,
        outDegree,
        betweenness: {}, // Advanced metric - not calculated
        closeness: {}    // Advanced metric - not calculated
      },
      adjacencyMatrix,
      nodeIds
    };
  };
  
  if (loading) {
    return (
      <Card className="card h-full">
        <CardHeader>
          <CardTitle>model analysis</CardTitle>
          <CardDescription>Analyzing network structure...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!analysis) {
    return (
      <Card className="card h-full">
        <CardHeader>
          <CardTitle>model analysis</CardTitle>
          <CardDescription>Add nodes and edges to see analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="nested-panel p-6 rounded-lg text-center text-[hsl(var(--muted-foreground))]">
            <p>Your model needs nodes and connections before analysis can be performed.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="card h-full">
      <CardHeader>
        <CardTitle>model analysis</CardTitle>
        <CardDescription>Network structure and metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="tab-bar mb-4">
            <TabsTrigger value="overview" className="tab">overview</TabsTrigger>
            <TabsTrigger value="centrality" className="tab">node centrality</TabsTrigger>
            <TabsTrigger value="matrix" className="tab">adjacency matrix</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="nested-panel space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Nodes</p>
                  <p className="text-2xl font-light">{analysis.nodeCount}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Edges</p>
                  <p className="text-2xl font-light">{analysis.edgeCount}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Density</p>
                  <p className="text-2xl font-light">{analysis.density.toFixed(2)}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Structure</p>
                  <div>
                    <Badge variant={analysis.isConnected ? "default" : "outline"} className="mr-1">
                      {analysis.isConnected ? "Connected" : "Disconnected"}
                    </Badge>
                    <Badge variant={analysis.hasLoop ? "default" : "outline"}>
                      {analysis.hasLoop ? "Has Loops" : "No Loops"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium mb-2">Node Types</h3>
                <div className="flex gap-2">
                  <div className="flex-1 nested-panel p-2">
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Driver</p>
                    <p className="text-xl font-light">
                      {model.nodes.filter(n => n.type === 'driver').length}
                    </p>
                  </div>
                  <div className="flex-1 nested-panel p-2">
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Regular</p>
                    <p className="text-xl font-light">
                      {model.nodes.filter(n => n.type === 'regular').length}
                    </p>
                  </div>
                  <div className="flex-1 nested-panel p-2">
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Outcome</p>
                    <p className="text-xl font-light">
                      {model.nodes.filter(n => n.type === 'outcome').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="centrality">
            <div className="nested-panel">
              <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2">
                {model.nodes.map(node => {
                  const inDegree = analysis.centrality.inDegree[node.id] || 0;
                  const outDegree = analysis.centrality.outDegree[node.id] || 0;
                  const betweenness = analysis.centrality.betweenness[node.id] || 0;
                  
                  return (
                    <div key={node.id} className="nested-panel p-3">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-sm font-medium">{node.label}</div>
                        <div className="text-xs px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--primary))]">
                          {node.type}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                        <div>
                          <span className="text-[hsl(var(--muted-foreground))]">In:</span> {inDegree}
                        </div>
                        <div>
                          <span className="text-[hsl(var(--muted-foreground))]">Out:</span> {outDegree}
                        </div>
                        <div>
                          <span className="text-[hsl(var(--muted-foreground))]">Total:</span> {inDegree + outDegree}
                        </div>
                        <div>
                          <span className="text-[hsl(var(--muted-foreground))]">Between:</span> {betweenness.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="matrix">
            <div className="nested-panel overflow-auto max-h-[400px]">
              <div className="min-w-max">
                <table className="text-xs">
                  <thead>
                    <tr>
                      <th className="p-1 text-right"></th>
                      {analysis.nodeIds.map((id, idx) => {
                        const node = model.nodes.find(n => n.id === id);
                        return (
                          <th key={id} className="p-1 text-center overflow-hidden whitespace-nowrap max-w-[60px]" title={node?.label}>
                            {node?.label?.substring(0, 4)}...
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.adjacencyMatrix.map((row, rowIdx) => {
                      const sourceId = analysis.nodeIds[rowIdx];
                      const sourceNode = model.nodes.find(n => n.id === sourceId);
                      
                      return (
                        <tr key={rowIdx}>
                          <th className="p-1 text-right overflow-hidden whitespace-nowrap max-w-[60px]" title={sourceNode?.label}>
                            {sourceNode?.label?.substring(0, 4)}...
                          </th>
                          {row.map((value, colIdx) => (
                            <td 
                              key={colIdx} 
                              className={`p-1 text-center w-10 h-10 ${
                                value !== 0 
                                  ? value > 0 
                                    ? 'bg-green-500/20' 
                                    : 'bg-red-500/20' 
                                  : 'bg-[hsl(var(--muted))]'
                              }`}
                            >
                              {value !== 0 ? value.toFixed(1) : ''}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}