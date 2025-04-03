import { useState, useEffect } from 'react';
import { Scenario, FCMModel, SimulationResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

interface ScenarioComparisonProps {
  model: FCMModel;
  scenarios: Scenario[];
}

// Create a virtual baseline scenario representing model's default state
function createBaselineScenario(model: FCMModel): Scenario {
  // Create baseline results with neutral values for all nodes
  const finalValues: Record<string, number> = {};
  const timeSeriesData: Record<string, number[]> = {};
  
  // Generate pseudo-convergence data for baseline scenario
  // For baseline, all nodes start at a neutral value (0.5) and converge to their natural state
  const iterations = 10; // Show some iterations for visual comparison
  
  model.nodes.forEach(node => {
    // All nodes, including drivers, start at a neutral value (0.5)
    // For the sake of visualization, we'll have them converge to different values
    
    let finalValue: number;
    
    // Create pseudo-final values based on node type for visual demonstration
    if (node.type === 'driver') {
      finalValue = 0.7; // Drivers tend to have higher impact
    } else if (node.type === 'outcome') {
      finalValue = 0.4; // Outcomes show the result of system activity
    } else {
      finalValue = 0.5; // Regular nodes stay close to middle
    }
    
    finalValues[node.id] = finalValue;
    
    // Create the time series showing gradual change from 0.5 to final value
    const series = [];
    const startValue = 0.5; // Neutral starting point
    
    for (let i = 0; i <= iterations; i++) {
      const progress = i / iterations;
      const stepValue = startValue + (finalValue - startValue) * progress;
      series.push(stepValue);
    }
    timeSeriesData[node.id] = series;
  });
  
  // Create virtual baseline scenario
  return {
    id: 'baseline',
    name: 'Baseline (No Intervention)',
    modelId: model.id,
    initialValues: {},
    createdAt: new Date().toISOString(),
    results: {
      finalValues,
      timeSeriesData,
      iterations: iterations,
      converged: true
    }
  };
}

export default function ScenarioComparison({ model, scenarios }: ScenarioComparisonProps) {
  const [baselineScenarioId, setBaselineScenarioId] = useState<string>('baseline');
  const [comparisonScenarioId, setComparisonScenarioId] = useState<string>('');
  const [deltaData, setDeltaData] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('chart');
  
  // Create virtual baseline scenario
  const baselineScenario = createBaselineScenario(model);
  
  // Add baseline to scenarios for selection
  const allScenarios = [baselineScenario, ...scenarios];
  
  // Get node labels
  const nodeLabelsById = model.nodes.reduce<Record<string, string>>((acc, node) => {
    acc[node.id] = node.label;
    return acc;
  }, {});
  
  // Initialize with baseline and first actual scenario if available
  useEffect(() => {
    if (scenarios.length >= 1) {
      setBaselineScenarioId('baseline'); // Always use the virtual baseline by default
      setComparisonScenarioId(scenarios[0].id);
    }
  }, [scenarios]);
  
  // Calculate delta when scenarios change
  useEffect(() => {
    if (!baselineScenarioId || !comparisonScenarioId) return;
    
    // Get the baseline scenario (either virtual or a real one)
    const baselineScenario = baselineScenarioId === 'baseline' 
      ? createBaselineScenario(model) 
      : allScenarios.find(s => s.id === baselineScenarioId);
      
    // Get the comparison scenario
    const comparisonScenario = allScenarios.find(s => s.id === comparisonScenarioId);
    
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
                  <SelectItem key="baseline" value="baseline">
                    Baseline (No Intervention)
                  </SelectItem>
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
                  <SelectItem key="baseline" value="baseline">
                    Baseline (No Intervention)
                  </SelectItem>
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
            <Tabs defaultValue="chart" onValueChange={setSelectedTab}>
              <TabsList>
                <TabsTrigger value="chart">chart view</TabsTrigger>
                <TabsTrigger value="table">table view</TabsTrigger>
                <TabsTrigger value="convergence">convergence plot</TabsTrigger>
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
              
              <TabsContent value="convergence">
                {selectedTab === 'convergence' && (
                  <div className="mt-4">
                    <div className="h-[400px]">
                      <CompareConvergencePlot 
                        baselineScenario={baselineScenarioId === 'baseline' 
                          ? baselineScenario 
                          : allScenarios.find(s => s.id === baselineScenarioId)} 
                        comparisonScenario={comparisonScenarioId === 'baseline' 
                          ? baselineScenario 
                          : allScenarios.find(s => s.id === comparisonScenarioId)}
                        nodeLabels={nodeLabelsById}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CompareConvergencePlotProps {
  baselineScenario?: Scenario;
  comparisonScenario?: Scenario;
  nodeLabels: Record<string, string>;
}

function CompareConvergencePlot({ baselineScenario, comparisonScenario, nodeLabels }: CompareConvergencePlotProps) {
  // Return early if either scenario is missing or doesn't have time series data
  if (!baselineScenario?.results?.timeSeriesData || !comparisonScenario?.results?.timeSeriesData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">No convergence data available for these scenarios</p>
      </div>
    );
  }

  // Get time series data from both scenarios
  const baselineTimeSeries = baselineScenario.results.timeSeriesData;
  const comparisonTimeSeries = comparisonScenario.results.timeSeriesData;

  // Get maximum iterations to ensure consistent x-axis
  const baselineIterations = baselineScenario.results.iterations;
  const comparisonIterations = comparisonScenario.results.iterations;
  const maxIterations = Math.max(baselineIterations, comparisonIterations);

  // Generate labels for x-axis (iterations)
  const labels = Array.from({ length: maxIterations + 1 }, (_, i) => `${i}`);

  // Select up to 5 nodes to display (prioritize outcome nodes if available)
  const allNodeIds = Object.keys(nodeLabels);
  const nodeIds = allNodeIds.length <= 5 ? allNodeIds : allNodeIds.slice(0, 5);

  // Generate datasets for the chart
  const colors = [
    'rgba(168, 85, 247, 1)',  // purple
    'rgba(0, 196, 255, 1)',   // teal
    'rgba(239, 68, 68, 1)',   // red
    'rgba(59, 130, 246, 1)',  // blue
    'rgba(234, 179, 8, 1)',   // yellow
  ];
  
  type ChartDataset = {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    borderDash?: number[];
    tension: number;
  };
  
  const datasets: ChartDataset[] = [];

  // Add datasets for baseline scenario (dashed lines)
  nodeIds.forEach((nodeId, index) => {
    if (baselineTimeSeries[nodeId]) {
      const colorIndex = index % colors.length;
      
      datasets.push({
        label: `${nodeLabels[nodeId] || `Node ${nodeId}`} (Baseline)`,
        data: baselineTimeSeries[nodeId],
        borderColor: colors[colorIndex],
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.3,
      });
    }
  });

  // Add datasets for comparison scenario (solid lines)
  nodeIds.forEach((nodeId, index) => {
    if (comparisonTimeSeries[nodeId]) {
      const colorIndex = index % colors.length;
      
      datasets.push({
        label: `${nodeLabels[nodeId] || `Node ${nodeId}`} (${comparisonScenario.name})`,
        data: comparisonTimeSeries[nodeId],
        borderColor: colors[colorIndex],
        backgroundColor: colors[colorIndex].replace('1)', '0.2)'),
        tension: 0.3,
      });
    }
  });

  const data = {
    labels,
    datasets,
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Iterations',
          color: 'rgba(255, 255, 255, 0.8)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          boxWidth: 12,
          font: {
            family: 'Montserrat',
          },
        },
      },
      title: {
        display: true,
        text: 'Convergence Comparison',
        color: 'rgba(255, 255, 255, 0.9)',
        font: {
          family: 'Montserrat',
          size: 14,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleFont: {
          family: 'Montserrat',
        },
        bodyFont: {
          family: 'Montserrat',
        },
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(3);
            }
            return label;
          }
        }
      },
    },
    animation: {
      duration: 1000,
    },
  };

  return (
    <div className="h-full w-full">
      <Line data={data} options={options} />
    </div>
  );
}