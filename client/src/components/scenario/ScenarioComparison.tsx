import { useState, useEffect, useRef } from 'react';
import { Scenario, FCMModel, SimulationResult } from '@/lib/types';
import { toStringId } from '@/lib/utils';
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

// Create a baseline scenario by running the FCM simulation with model's original node values
function createBaselineScenario(model: FCMModel): Scenario {
  // Variables to hold simulation results - will be populated by runRealBaseline
  let baselineResult: SimulationResult | null = null;
  
  // Unique ID for this model to avoid re-running simulations
  const simulationId = `baseline-${model.id}`;
  
  // Function to run a real simulation for the baseline
  const runRealBaseline = async () => {
    // Check if we've already run this simulation in the session
    const cachedResult = sessionStorage.getItem(simulationId);
    if (cachedResult) {
      try {
        return JSON.parse(cachedResult) as SimulationResult;
      } catch (e) {
        console.error('Failed to parse cached simulation result', e);
        // Fall through to run the simulation again
      }
    }
    
    try {
      // Prepare data for Python simulation API using the model's default values
      const reactFlowNodes = model.nodes.map(node => ({
        id: node.id,
        data: {
          label: node.label,
          value: node.value, // Use the actual node values (not 0.5)
          type: node.type
        }
      }));
      
      const reactFlowEdges = model.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        data: {
          weight: edge.weight
        }
      }));
      
      // Prepare payload
      const payload = {
        nodes: reactFlowNodes,
        edges: reactFlowEdges,
        activation: 'sigmoid',
        threshold: 0.001,
        maxIterations: 20,
      };
      
      // Call the simulation API
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Convert API response to our format
      const formattedResult = {
        finalValues: result.finalState || result.finalValues || {},
        timeSeriesData: result.timeSeries || result.timeSeriesData || {},
        iterations: result.iterations || 0,
        converged: result.converged || false
      };
      
      // Cache the result in session storage
      try {
        sessionStorage.setItem(simulationId, JSON.stringify(formattedResult));
      } catch (e) {
        console.error('Failed to cache simulation result', e);
      }
      
      return formattedResult;
    } catch (error) {
      console.error('Failed to run baseline simulation:', error);
      // Return fallback result with just the original values as final
      const fallbackFinalValues: Record<string, number> = {};
      const fallbackTimeSeries: Record<string, number[]> = {};
      
      model.nodes.forEach(node => {
        const nodeId = toStringId(node.id);
        fallbackFinalValues[nodeId] = node.value;
        fallbackTimeSeries[nodeId] = [node.value]; // Just one data point
      });
      
      return {
        finalValues: fallbackFinalValues,
        timeSeriesData: fallbackTimeSeries,
        iterations: 0,
        converged: false
      };
    }
  };
  
  // Synchronously create and return the scenario object
  // (The actual simulation will be run when needed)
  const modelId = toStringId(model.id);
  
  console.log('Creating baseline scenario for model:', { 
    modelId, 
    type: typeof model.id, 
    nodeCount: model.nodes.length 
  });
  
  // Initialize a stub of the baseline scenario
  // We'll replace the results when the simulation finishes
  return {
    id: 'baseline',
    name: 'Baseline (No Intervention)',
    modelId: modelId,
    initialValues: {},
    createdAt: new Date().toISOString(),
    // We'll use the fallback initially, but replace it with the actual results when they're ready
    results: {
      finalValues: {},
      timeSeriesData: {},
      iterations: 0,
      converged: false,
      baselineFinalState: {},
      baselineTimeSeries: {},
      baselineIterations: 0,
      baselineConverged: false,
      deltaState: {}
    },
    // Attach the async function that will fetch the real simulation results
    // This will be called when the scenario is selected
    runRealBaseline,
    // Flag to track if the simulation has been requested
    simulationRequested: false
  } as Scenario & { 
    runRealBaseline: () => Promise<SimulationResult>;
    simulationRequested: boolean;
  };
}

export default function ScenarioComparison({ model, scenarios }: ScenarioComparisonProps) {
  const [baselineScenarioId, setBaselineScenarioId] = useState<string>('baseline');
  const [comparisonScenarioId, setComparisonScenarioId] = useState<string>('');
  const [deltaData, setDeltaData] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('chart');
  
  // Create baseline scenario only once - using a ref to prevent recreation on each render
  const baselineScenarioRef = useRef<Scenario>();
  const [baselineHasRun, setBaselineHasRun] = useState(false);
  
  if (!baselineScenarioRef.current) {
    baselineScenarioRef.current = createBaselineScenario(model);
  }
  
  // Use the memoized baselineScenario
  const baselineScenario = baselineScenarioRef.current;
  
  // Run the baseline simulation once when the component mounts
  useEffect(() => {
    async function runBaselineSimulation() {
      if (baselineScenario && !baselineHasRun && (baselineScenario as any).runRealBaseline) {
        console.log('Running real baseline simulation for chart/table views');
        try {
          const results = await (baselineScenario as any).runRealBaseline();
          // Update the scenario's results
          baselineScenario.results = {
            ...baselineScenario.results,
            finalValues: results.finalValues,
            timeSeriesData: results.timeSeriesData,
            iterations: results.iterations,
            converged: results.converged
          };
          setBaselineHasRun(true);
        } catch (error) {
          console.error('Failed to run baseline simulation:', error);
        }
      }
    }
    
    runBaselineSimulation();
  }, [baselineScenario]);
  
  // Add baseline to scenarios for selection
  const allScenarios = [baselineScenario, ...scenarios];
  
  // Get node labels
  const nodeLabelsById = model.nodes.reduce<Record<string, string>>((acc, node) => {
    const nodeId = toStringId(node.id);
    acc[nodeId] = node.label;
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
    if (!baselineScenarioId || !comparisonScenarioId) {
      console.log('Missing scenario IDs', { baselineScenarioId, comparisonScenarioId });
      return;
    }
    
    // Get the baseline scenario (either virtual or a real one)
    const selectedBaselineScenario = baselineScenarioId === 'baseline' 
      ? baselineScenarioRef.current 
      : allScenarios.find(s => s.id === baselineScenarioId);
      
    // Get the comparison scenario
    const comparisonScenario = allScenarios.find(s => s.id === comparisonScenarioId);
    
    console.log('Scenarios found:', { 
      baselineScenario: !!selectedBaselineScenario, 
      comparisonScenario: !!comparisonScenario,
      baselineResults: !!selectedBaselineScenario?.results,
      comparisonResults: !!comparisonScenario?.results
    });
    
    // Safety checks for results and finalValues existence
    if (!selectedBaselineScenario?.results || !comparisonScenario?.results) return;
    if (!selectedBaselineScenario.results.finalValues || !comparisonScenario.results.finalValues) return;
    
    // Calculate delta between baseline and comparison scenario
    const baselineFinal = selectedBaselineScenario.results.finalValues;
    const comparisonFinal = comparisonScenario.results.finalValues;
    
    console.log('Final values:', { 
      baselineFinal: Object.keys(baselineFinal).length > 0 ? 'has data' : 'empty', 
      comparisonFinal: Object.keys(comparisonFinal).length > 0 ? 'has data' : 'empty'
    });
    
    // Create comparison data
    const nodes = Object.keys(nodeLabelsById);
    console.log('Node IDs found:', nodes);
    
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
        type: model.nodes.find(n => toStringId(n.id) === nodeId)?.type || 'regular'
      };
    });
    
    console.log('Delta data generated:', newDeltaData.length > 0 ? 'has data' : 'empty', newDeltaData);
    
    // Update state
    setDeltaData(newDeltaData);
  }, [baselineScenarioId, comparisonScenarioId, scenarios, nodeLabelsById, model.nodes]);
  
  // Group nodes by type
  const nodesByType = model.nodes.reduce<Record<string, string[]>>((acc, node) => {
    const type = node.type || 'regular';
    const nodeId = toStringId(node.id);
    acc[type] = acc[type] || [];
    acc[type].push(nodeId);
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
                          ? baselineScenarioRef.current 
                          : allScenarios.find(s => s.id === baselineScenarioId)} 
                        comparisonScenario={comparisonScenarioId === 'baseline' 
                          ? baselineScenarioRef.current 
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
  // We don't need to run the simulation again since it's already handled in the parent component
  // and the results are already stored in the baselineScenario.results
  
  // Get the actual results directly from the scenario object
  const actualBaselineResults = baselineScenario?.results;
  
  // Add debugging for convergence issues
  console.log('CompareConvergencePlot - Scenarios:', { 
    baselineId: baselineScenario?.id,
    comparisonId: comparisonScenario?.id,
    baselineHasTimeSeries: !!actualBaselineResults?.timeSeriesData,
    comparisonHasTimeSeries: !!comparisonScenario?.results?.timeSeriesData,
    baselineTimeSeriesKeys: actualBaselineResults?.timeSeriesData ? Object.keys(actualBaselineResults.timeSeriesData).length : 0,
    comparisonTimeSeriesKeys: comparisonScenario?.results?.timeSeriesData ? Object.keys(comparisonScenario.results.timeSeriesData).length : 0
  });
  
  // No loading indicator needed anymore since we handle the simulation in the parent component
  
  // Handle both timeSeriesData and timeSeries field naming for backward compatibility
  const hasBaselineTimeSeries = !!actualBaselineResults?.timeSeriesData || 
                               !!actualBaselineResults?.baselineTimeSeries || 
                               !!(actualBaselineResults as any)?.timeSeries;
                            
  const hasComparisonTimeSeries = !!comparisonScenario?.results?.timeSeriesData || 
                                 !!(comparisonScenario?.results as any)?.timeSeries;
  
  // Return early if either scenario is missing or doesn't have time series data
  if (!hasBaselineTimeSeries || !hasComparisonTimeSeries) {
    console.error('Missing time series data in scenarios:', {
      baselineResultsExists: !!actualBaselineResults,
      comparisonResultsExists: !!comparisonScenario?.results,
      baselineTimeSeriesExists: hasBaselineTimeSeries,
      comparisonTimeSeriesExists: hasComparisonTimeSeries,
      baselineResultsFields: actualBaselineResults ? Object.keys(actualBaselineResults) : [],
      comparisonResultsFields: comparisonScenario?.results ? Object.keys(comparisonScenario.results) : []
    });
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">No convergence data available for these scenarios</p>
      </div>
    );
  }

  // Get time series data from both scenarios, handling different field names
  const baselineTimeSeries = actualBaselineResults?.timeSeriesData || 
                            actualBaselineResults?.baselineTimeSeries || 
                            (actualBaselineResults as any)?.timeSeries || {};
                            
  const comparisonTimeSeries = comparisonScenario?.results?.timeSeriesData || 
                              (comparisonScenario?.results as any)?.timeSeries || {};
  
  // Debug what the time series data actually contains
  console.log('Time series data inspection:', {
    baselineTimeSeriesKeys: Object.keys(baselineTimeSeries),
    comparisonTimeSeriesKeys: Object.keys(comparisonTimeSeries),
    baselineTimeSeries: JSON.stringify(baselineTimeSeries).substring(0, 100) + '...',
    comparisonTimeSeries: JSON.stringify(comparisonTimeSeries).substring(0, 100) + '...'
  });

  // Get maximum iterations to ensure consistent x-axis
  const baselineIterations = actualBaselineResults?.iterations || 0;
  const comparisonIterations = comparisonScenario?.results?.iterations || 0;
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
    console.log(`Checking baseline dataset for node ${nodeId}:`, {
      exists: !!baselineTimeSeries[nodeId],
      dataType: baselineTimeSeries[nodeId] ? typeof baselineTimeSeries[nodeId] : 'missing',
      isArray: baselineTimeSeries[nodeId] ? Array.isArray(baselineTimeSeries[nodeId]) : false,
      arrayLength: baselineTimeSeries[nodeId] ? baselineTimeSeries[nodeId].length : 0
    });
    
    if (baselineTimeSeries[nodeId] && Array.isArray(baselineTimeSeries[nodeId])) {
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
    console.log(`Checking comparison dataset for node ${nodeId}:`, {
      exists: !!comparisonTimeSeries[nodeId],
      dataType: comparisonTimeSeries[nodeId] ? typeof comparisonTimeSeries[nodeId] : 'missing',
      isArray: comparisonTimeSeries[nodeId] ? Array.isArray(comparisonTimeSeries[nodeId]) : false,
      arrayLength: comparisonTimeSeries[nodeId] ? comparisonTimeSeries[nodeId].length : 0,
      value: comparisonTimeSeries[nodeId] ? JSON.stringify(comparisonTimeSeries[nodeId]).substring(0, 50) + '...' : 'null'
    });
    
    if (comparisonTimeSeries[nodeId] && Array.isArray(comparisonTimeSeries[nodeId])) {
      const colorIndex = index % colors.length;
      
      datasets.push({
        label: `${nodeLabels[nodeId] || `Node ${nodeId}`} (${comparisonScenario?.name || 'Comparison'})`,
        data: comparisonTimeSeries[nodeId],
        borderColor: colors[colorIndex],
        backgroundColor: colors[colorIndex].replace('1)', '0.2)'),
        tension: 0.3,
      });
    }
  });

  // More debugging for chart data generation
  console.log('Chart data preparation:', {
    maxIterations,
    labelCount: labels.length,
    nodeIdsFound: nodeIds,
    datasetsGenerated: datasets.length,
    baselineDatasetCount: nodeIds.filter(id => baselineTimeSeries[id]).length,
    comparisonDatasetCount: nodeIds.filter(id => comparisonTimeSeries[id]).length
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