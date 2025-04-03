import { useState, useEffect } from 'react';
import { Scenario, FCMModel } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ScenarioComparisonProps {
  model: FCMModel;
  scenarios: Scenario[];
}

export default function ScenarioComparison({ model, scenarios }: ScenarioComparisonProps) {
  const [baselineScenarioId, setBaselineScenarioId] = useState<string>('');
  const [comparisonScenarioId, setComparisonScenarioId] = useState<string>('');
  const [deltaData, setDeltaData] = useState<any[]>([]);
  
  // Get node labels
  const nodeLabelsById = model.nodes.reduce<Record<string, string>>((acc, node) => {
    acc[node.id] = node.label;
    return acc;
  }, {});
  
  // Initialize with the first two scenarios if available
  useEffect(() => {
    if (scenarios.length >= 2) {
      setBaselineScenarioId(scenarios[0].id);
      setComparisonScenarioId(scenarios[1].id);
    } else if (scenarios.length === 1) {
      setBaselineScenarioId(scenarios[0].id);
      setComparisonScenarioId(scenarios[0].id);
    }
  }, [scenarios]);
  
  // Calculate delta when scenarios change
  useEffect(() => {
    if (!baselineScenarioId || !comparisonScenarioId) return;
    
    const baselineScenario = scenarios.find(s => s.id === baselineScenarioId);
    const comparisonScenario = scenarios.find(s => s.id === comparisonScenarioId);
    
    // Safety checks for results and finalValues existence
    if (!baselineScenario?.results || !comparisonScenario?.results) return;
    if (!baselineScenario.results.finalValues || !comparisonScenario.results.finalValues) return;
    
    // Calculate delta between baseline and comparison scenario
    const baselineFinal = baselineScenario.results.finalValues;
    const comparisonFinal = comparisonScenario.results.finalValues;
    
    // Create comparison data
    const nodes = Object.keys(nodeLabelsById);
    const newDeltaData = nodes.filter(nodeId => nodeLabelsById[nodeId]).map(nodeId => {
      // Safely access values with fallbacks
      const baselineValue = baselineFinal && typeof baselineFinal[nodeId] === 'number' 
        ? baselineFinal[nodeId] 
        : 0;
      
      const comparisonValue = comparisonFinal && typeof comparisonFinal[nodeId] === 'number'
        ? comparisonFinal[nodeId]
        : 0;
        
      const delta = comparisonValue - baselineValue;
      
      return {
        name: nodeLabelsById[nodeId] || `Node ${nodeId}`,
        nodeId,
        baseline: baselineValue,
        comparison: comparisonValue,
        delta: delta,
        type: model.nodes.find(n => n.id === nodeId)?.type || 'regular'
      };
    });
    
    // Update state
    setDeltaData(newDeltaData);
  }, [baselineScenarioId, comparisonScenarioId, scenarios, nodeLabelsById, model.nodes]);
  
  // Group nodes by type
  const nodesByType = model.nodes.reduce<Record<string, string[]>>((acc, node) => {
    const type = node.type || 'regular';
    acc[type] = acc[type] || [];
    acc[type].push(node.id);
    return acc;
  }, {});
  
  if (scenarios.length < 1) {
    return (
      <Card className="dark-glass border border-white/10">
        <CardHeader>
          <CardTitle>scenario comparison</CardTitle>
          <CardDescription>No scenarios available to compare</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className="dark-glass border border-white/10">
      <CardHeader>
        <CardTitle>scenario comparison</CardTitle>
        <CardDescription>Compare results between different scenarios</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Scenario selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm mb-2">Baseline Scenario</div>
              <Select 
                value={baselineScenarioId} 
                onValueChange={setBaselineScenarioId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select baseline scenario" />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((scenario) => (
                    <SelectItem key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <div className="text-sm mb-2">Comparison Scenario</div>
              <Select 
                value={comparisonScenarioId} 
                onValueChange={setComparisonScenarioId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select comparison scenario" />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((scenario) => (
                    <SelectItem key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Comparison data */}
          {deltaData.length > 0 && (
            <Tabs defaultValue="chart">
              <TabsList>
                <TabsTrigger value="chart">chart view</TabsTrigger>
                <TabsTrigger value="table">table view</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chart">
                <div className="h-[400px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={deltaData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 60,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end"
                        height={80}
                        tick={{fontSize: 12}}
                      />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a202c', border: 'none', borderRadius: '4px' }}
                        formatter={(value: any, name: any) => [parseFloat(value).toFixed(3), name]}
                      />
                      <Bar dataKey="delta" fill="#8884d8" name="Difference" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              
              <TabsContent value="table">
                <div className="overflow-x-auto">
                  <table className="w-full mt-4">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-2 text-left text-xs uppercase tracking-wider text-gray-400">Node</th>
                        <th className="py-2 text-left text-xs uppercase tracking-wider text-gray-400">Type</th>
                        <th className="py-2 text-left text-xs uppercase tracking-wider text-gray-400">Baseline</th>
                        <th className="py-2 text-left text-xs uppercase tracking-wider text-gray-400">Comparison</th>
                        <th className="py-2 text-left text-xs uppercase tracking-wider text-gray-400">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Safe rendering of each node type group */}
                      {Object.keys(nodesByType).map(type => {
                        // Get rows for this node type
                        const typeRows = deltaData.filter(data => data.type === type);
                        
                        // If no rows for this type, skip
                        if (typeRows.length === 0) return null;
                        
                        // Return the rows for this type
                        return typeRows.map((row, index) => (
                          <tr key={row.nodeId || `row-${index}`} className="border-b border-white/5">
                            <td className="py-2">{row.name}</td>
                            <td className="py-2">
                              <Badge variant="outline">{row.type}</Badge>
                            </td>
                            <td className="py-2">{typeof row.baseline === 'number' ? row.baseline.toFixed(3) : '0.000'}</td>
                            <td className="py-2">{typeof row.comparison === 'number' ? row.comparison.toFixed(3) : '0.000'}</td>
                            <td className={`py-2 ${row.delta > 0 ? 'text-green-400' : row.delta < 0 ? 'text-red-400' : ''}`}>
                              {row.delta > 0 ? '+' : ''}{typeof row.delta === 'number' ? row.delta.toFixed(3) : '0.000'}
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  );
}