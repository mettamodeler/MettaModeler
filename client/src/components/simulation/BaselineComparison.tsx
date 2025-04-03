import { FCMModel, SimulationResult, FCMNode } from '@/lib/types';
import { toStringId } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface BaselineComparisonProps {
  model: FCMModel;
  result: SimulationResult;
}

export default function BaselineComparison({ model, result }: BaselineComparisonProps) {
  // If there's no delta state, we don't have a baseline comparison
  if (!result.deltaState) {
    return (
      <Card className="dark-glass border border-white/10">
        <CardHeader>
          <CardTitle>Baseline Comparison</CardTitle>
          <CardDescription>
            No baseline comparison available
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Get node labels mapped by ID
  // Log for debugging the state of the model
  console.log('BaselineComparison model:', { 
    modelId: model.id, 
    type: typeof model.id, 
    nodeCount: model.nodes.length,
    result: !!result
  });
  
  const nodeLabelsById = model.nodes.reduce<Record<string, string>>((acc, node) => {
    // Ensure nodeId is handled as string regardless of type
    const nodeId = toStringId(node.id);
    acc[nodeId] = node.label;
    return acc;
  }, {});

  // Group nodes by type (driver, regular, outcome)
  const nodesByType = model.nodes.reduce<Record<string, FCMNode[]>>((acc, node) => {
    const type = node.type || 'regular';
    acc[type] = acc[type] || [];
    acc[type].push(node);
    return acc;
  }, {});

  // Get total change for each type
  const typeChanges = Object.entries(nodesByType).reduce<Record<string, number>>((acc, [type, nodes]) => {
    acc[type] = nodes.reduce((sum, node) => {
      const nodeId = toStringId(node.id);
      return sum + Math.abs(result.deltaState?.[nodeId] || 0);
    }, 0);
    return acc;
  }, {});

  // Calculate maximum absolute delta for progress bar scaling
  const maxDelta = Math.max(
    ...Object.values(result.deltaState).map(val => Math.abs(val))
  );

  return (
    <Card className="dark-glass border border-white/10">
      <CardHeader>
        <CardTitle>Baseline Comparison</CardTitle>
        <CardDescription>
          Compare scenario results to baseline simulation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary information - iterations comparison */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 mb-1">Baseline iterations</p>
              <p className="text-lg">{result.baselineIterations}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Scenario iterations</p>
              <p className="text-lg">{result.iterations}</p>
            </div>
          </div>
          
          {/* Delta visualizations */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400">Changes from Baseline</h3>
            
            {/* Show changes by node type */}
            {['outcome', 'regular', 'driver'].map(type => {
              const nodesOfType = nodesByType[type] || [];
              if (nodesOfType.length === 0) return null;
              
              return (
                <div key={type} className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wider text-gray-500 flex items-center">
                    <Badge variant="secondary" className="mr-2">
                      {type}
                    </Badge>
                    Nodes
                  </h4>
                  
                  {nodesOfType.map(node => {
                    const nodeId = toStringId(node.id);
                    const delta = result.deltaState?.[nodeId] || 0;
                    const absPercentage = Math.min(Math.abs(delta) / (maxDelta || 1) * 100, 100);
                    const colorClass = delta > 0 
                      ? 'bg-green-500' 
                      : delta < 0 
                        ? 'bg-red-500' 
                        : 'bg-gray-500';
                    
                    return (
                      <div key={nodeId} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{nodeLabelsById[nodeId]}</span>
                          <span className={delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-400'}>
                            {delta > 0 ? '+' : ''}{delta.toFixed(3)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${colorClass} transition-all`} 
                            style={{ width: `${absPercentage}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}