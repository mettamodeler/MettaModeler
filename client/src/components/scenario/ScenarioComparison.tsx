import { useState, useEffect, useRef } from 'react';
import { Scenario, FCMModel, SimulationResult } from '@/lib/types';
import { toStringId } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ScenarioSelector from './ScenarioSelector';
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
  
  // Create default initialValues from the model
  const defaultInitialValues = model.nodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.id] = node.value;
    return acc;
  }, {});
  
  // Function to run a real simulation for the baseline
  const runRealBaseline = async () => {
    console.log("Running real baseline simulation for chart/table views");
    
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
          value: node.value, // Use the model's default values for baseline
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
  
  // Create a unique baseline ID for each model to prevent cross-contamination
  // Use the unique model ID for this to ensure different models have different baselines
  const uniqueBaselineId = `baseline-${modelId}`;
  
  // Initialize a stub of the baseline scenario
  // We'll replace the results when the simulation finishes
  return {
    id: uniqueBaselineId,
    name: 'Baseline (No Intervention)',
    modelId: modelId,
    // Empty initialValues differentiates this from comparison scenarios
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
  // Create state variables first
  const [comparisonScenarioId, setComparisonScenarioId] = useState<string>('');
  const [deltaData, setDeltaData] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('chart');
  const [baselineHasRun, setBaselineHasRun] = useState(false);
  
  // Create baseline scenario only once - using a ref to prevent recreation on each render
  const baselineScenarioRef = useRef<Scenario>();
  
  // Reference for tracking if comparison simulation has been run
  const isFirstRunRef = useRef(true);
  
  // Initialize the ref if it's not already set
  if (!baselineScenarioRef.current) {
    baselineScenarioRef.current = createBaselineScenario(model);
  }
  
  // Create a more specific ID that changes with each model
  const uniqueBaselineId = baselineScenarioRef.current?.id || 'baseline';
  const [baselineScenarioId, setBaselineScenarioId] = useState<string>(uniqueBaselineId);
  
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
      // Use the actual ID from the baseline scenario object rather than the string 'baseline'
      setBaselineScenarioId(baselineScenarioRef.current?.id || 'baseline');
      setComparisonScenarioId(scenarios[0].id);
    }
  }, [scenarios]);
  
  // Function to run a simulation with given initial values
  const runScenarioSimulation = async (initialValues: Record<string, number> = {}) => {
    try {
      // Prepare data for Python simulation API using the model's current structure
      // but with customized initial values from the scenario
      const reactFlowNodes = model.nodes.map(node => ({
        id: node.id,
        data: {
          label: node.label,
          // Use the scenario's initial value if available, otherwise use model default
          value: initialValues[node.id] !== undefined ? initialValues[node.id] : node.value,
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
      console.log('Raw API response structure:', Object.keys(result));
      
      // Check if time series data exists in the response
      if (!result.timeSeries && !result.timeSeriesData) {
        console.warn('No time series data in API response. Raw result:', result);
      }
      
      // Convert API response to our format with both field names for compatibility
      const formattedResult = {
        finalValues: result.finalState || result.finalValues || {},
        finalState: result.finalState || result.finalValues || {},
        timeSeriesData: result.timeSeries || result.timeSeriesData || {},
        timeSeries: result.timeSeries || result.timeSeriesData || {},
        iterations: result.iterations || 0,
        converged: result.converged || false
      };
      
      console.log('Formatted result structure:', {
        hasTimeSeriesData: !!formattedResult.timeSeriesData,
        timeSeriesDataKeys: Object.keys(formattedResult.timeSeriesData).length,
        hasFinalValues: !!formattedResult.finalValues,
        finalValuesKeys: Object.keys(formattedResult.finalValues).length
      });
      
      return formattedResult;
    } catch (error) {
      console.error('Failed to run scenario simulation:', error);
      return null;
    }
  };

  // Calculate delta when scenarios change
  useEffect(() => {
    if (!baselineScenarioId || !comparisonScenarioId) {
      console.log('Missing scenario IDs', { baselineScenarioId, comparisonScenarioId });
      return;
    }
    
    // Debug the available scenario IDs vs what we're looking for
    console.log('Scenario ID verification:', {
      lookingForBaselineId: baselineScenarioId,
      lookingForComparisonId: comparisonScenarioId,
      availableScenarioIds: allScenarios.map(s => ({ id: s.id, type: typeof s.id })),
      baselineMatches: allScenarios.filter(s => String(s.id) === String(baselineScenarioId)).length,
      comparisonMatches: allScenarios.filter(s => String(s.id) === String(comparisonScenarioId)).length
    });
    
    // Use string comparison for safer ID matching to handle number vs string ID issues
    const selectedBaselineScenario = allScenarios.find(s => String(s.id) === String(baselineScenarioId)) || baselineScenarioRef.current;
      
    // Get the comparison scenario using string comparison for ID matching
    const comparisonScenario = allScenarios.find(s => String(s.id) === String(comparisonScenarioId));
    
    console.log('Scenarios found:', { 
      baselineScenario: !!selectedBaselineScenario, 
      comparisonScenario: !!comparisonScenario,
      baselineId: selectedBaselineScenario?.id,
      comparisonId: comparisonScenario?.id,
      baselineResults: !!selectedBaselineScenario?.results,
      comparisonResults: !!comparisonScenario?.results
    });
    
    // Early return if either scenario is missing
    if (!selectedBaselineScenario || !comparisonScenario) {
      console.log('Cannot proceed: Missing one or both scenarios');
      setDeltaData([]); // Clear delta data when scenarios are missing
      return;
    }
    
    // Run simulations with the correct initial values for each scenario
    async function runComparisonSimulations() {
      // Get the default initial values (from the model's current node values)
      const defaultInitialValues = model.nodes.reduce<Record<string, number>>((acc, node) => {
        acc[node.id] = node.value;
        return acc;
      }, {});
      
      // Run baseline simulation with model default values (or special baseline values if provided)
      const baselineInitialValues = selectedBaselineScenario?.id === 'baseline-' + model.id 
        ? defaultInitialValues 
        : (selectedBaselineScenario?.initialValues || defaultInitialValues);
        
      console.log('Running baseline simulation with initial values:', baselineInitialValues);
      const baselineResults = await runScenarioSimulation(baselineInitialValues);
      
      // Run comparison simulation with the scenario's initial values
      const comparisonInitialValues = comparisonScenario?.initialValues || defaultInitialValues;
      console.log('Running comparison simulation with initial values:', comparisonInitialValues);
      const comparisonResults = await runScenarioSimulation(comparisonInitialValues);
      
      console.log('Ran live simulations with scenario initial values:', {
        baselineHasCustomValues: Object.keys(selectedBaselineScenario?.initialValues || {}).length > 0,
        comparisonHasCustomValues: Object.keys(comparisonScenario?.initialValues || {}).length > 0,
        baselineResults: !!baselineResults,
        comparisonResults: !!comparisonResults
      });
      
      // If either simulation failed, return early
      if (!baselineResults || !comparisonResults) return;
      
      // Get final values from simulation results
      const baselineFinal = baselineResults.finalValues;
      const comparisonFinal = comparisonResults.finalValues;
      
      // Update the results in the scenario objects for the chart and table to use
      if (selectedBaselineScenario) {
        selectedBaselineScenario.results = {
          ...selectedBaselineScenario.results || {},
          ...baselineResults
        };
      }
      
      if (comparisonScenario) {
        comparisonScenario.results = {
          ...comparisonScenario.results || {},
          ...comparisonResults
        };
      }
      
      console.log('Final values:', { 
        baselineFinal: baselineResults?.finalValues && Object.keys(baselineResults.finalValues).length > 0 ? 'has data' : 'empty', 
        comparisonFinal: comparisonResults?.finalValues && Object.keys(comparisonResults.finalValues).length > 0 ? 'has data' : 'empty'
      });
    
      // Create comparison data
      const nodes = Object.keys(nodeLabelsById);
      console.log('Node IDs found:', nodes);
      
      const newDeltaData = nodes.filter(nodeId => nodeLabelsById[nodeId]).map(nodeId => {
        // Safely access values with fallbacks
        const baselineValue = baselineResults?.finalValues && typeof baselineResults.finalValues[nodeId] === 'number' 
          ? baselineResults.finalValues[nodeId] 
          : 0;
        
        const comparisonValue = comparisonResults?.finalValues && typeof comparisonResults.finalValues[nodeId] === 'number'
          ? comparisonResults.finalValues[nodeId]
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
    }
    
    // Run the comparison simulations whenever the selected scenarios change
    // Using a manual simulation trigger here to avoid infinite loops
    if (isFirstRunRef.current || 
        (baselineScenarioId && comparisonScenarioId && 
        allScenarios.find(s => String(s.id) === String(baselineScenarioId)) && 
        allScenarios.find(s => String(s.id) === String(comparisonScenarioId)))) {
      isFirstRunRef.current = false;
      runComparisonSimulations();
    }
  }, [baselineScenarioId, comparisonScenarioId, scenarios]);
  
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
            <ScenarioSelector 
              value={baselineScenarioId}
              onValueChange={setBaselineScenarioId}
              scenarios={scenarios}
              baselineId={uniqueBaselineId}
              label="Baseline Scenario"
              placeholder="Select baseline scenario"
            />
            
            <ScenarioSelector 
              value={comparisonScenarioId}
              onValueChange={setComparisonScenarioId}
              scenarios={scenarios}
              baselineId={uniqueBaselineId}
              label="Comparison Scenario"
              placeholder="Select comparison scenario"
            />
          </div>
          
          {/* Check if both scenarios are selected */}
          {(!baselineScenarioId || !comparisonScenarioId) ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-amber-400 mb-2">Please select both baseline and comparison scenarios</p>
              <p className="text-gray-400 text-sm">The comparison view will show differences between scenarios</p>
            </div>
          ) : (
            <Tabs defaultValue="chart" onValueChange={setSelectedTab}>
              <TabsList>
                <TabsTrigger value="chart" disabled={deltaData.length === 0}>chart view</TabsTrigger>
                <TabsTrigger value="table" disabled={deltaData.length === 0}>table view</TabsTrigger>
                <TabsTrigger value="convergence">convergence plot</TabsTrigger>
              </TabsList>
              
              {deltaData.length === 0 && selectedTab !== 'convergence' ? (
                <div className="flex flex-col items-center justify-center p-8 h-[400px] text-center">
                  <p className="text-amber-400 mb-2">Waiting for comparison data...</p>
                  <p className="text-gray-400 text-sm">
                    Select the convergence plot tab to view simulation progress,<br />
                    or make sure both scenarios have been simulated.
                  </p>
                </div>
              ) : (
                <>
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
                </>
              )}
              
              <TabsContent value="convergence">
                {selectedTab === 'convergence' && (
                  <div className="mt-4">
                    <div className="h-[400px]">
                      <CompareConvergencePlot 
                        baselineScenario={allScenarios.find(s => String(s.id) === String(baselineScenarioId)) || baselineScenarioRef.current}
                        comparisonScenario={allScenarios.find(s => String(s.id) === String(comparisonScenarioId))}
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
    comparisonTimeSeriesKeys: comparisonScenario?.results?.timeSeriesData ? Object.keys(comparisonScenario.results.timeSeriesData).length : 0,
    // Check if scenarios are the same object reference
    areSameScenario: baselineScenario === comparisonScenario,
    // Check if results are the same object reference
    areSameResults: actualBaselineResults === comparisonScenario?.results,
    // Compare IDs to ensure they're different
    baselineScenarioId: baselineScenario?.id,
    comparisonScenarioId: comparisonScenario?.id,
    // Are initial values different?
    initialValuesEqual: baselineScenario?.initialValues && comparisonScenario?.initialValues ? 
      JSON.stringify(baselineScenario.initialValues) === JSON.stringify(comparisonScenario.initialValues) : 'N/A',
  });
  
  // No loading indicator needed anymore since we handle the simulation in the parent component
  
  // Check if we have scenario results
  if (!baselineScenario || !comparisonScenario) {
    console.log('Scenarios found:', {
      baselineScenario: !!baselineScenario,
      comparisonScenario: !!comparisonScenario,
      baselineResults: !!baselineScenario?.results,
      comparisonResults: !!comparisonScenario?.results
    });
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Select both baseline and comparison scenarios to view convergence plot</p>
      </div>
    );
  }
  
  // Handle both timeSeriesData and timeSeries field naming for backward compatibility
  // Try retrieving time series data from multiple possible field names
  const baselineTimeSeriesData = 
    actualBaselineResults?.timeSeriesData || 
    actualBaselineResults?.timeSeries || 
    (actualBaselineResults as any)?.baselineTimeSeries || 
    {};
                            
  const comparisonTimeSeriesData = 
    comparisonScenario?.results?.timeSeriesData || 
    comparisonScenario?.results?.timeSeries || 
    {};
  
  // Check if we have time series data
  const hasBaselineTimeSeries = Object.keys(baselineTimeSeriesData).length > 0;
  const hasComparisonTimeSeries = Object.keys(comparisonTimeSeriesData).length > 0;
  
  // Return early if either scenario doesn't have time series data
  if (!hasBaselineTimeSeries || !hasComparisonTimeSeries) {
    console.error('Missing time series data in scenarios:', {
      baselineResultsExists: !!actualBaselineResults,
      comparisonResultsExists: !!comparisonScenario?.results,
      baselineTimeSeriesExists: hasBaselineTimeSeries,
      comparisonTimeSeriesExists: hasComparisonTimeSeries,
      baselineResultsFields: actualBaselineResults ? Object.keys(actualBaselineResults) : [],
      comparisonResultsFields: comparisonScenario?.results ? Object.keys(comparisonScenario.results) : []
    });
    
    // If we're missing time series data, run the simulation with the current model
    if (!hasComparisonTimeSeries) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <p className="text-amber-400">Waiting for simulation data...</p>
          <p className="text-gray-400 text-sm">Select "Run Comparison" to generate convergence data</p>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">No convergence data available for these scenarios</p>
      </div>
    );
  }

  // Check if we're comparing a scenario to itself
  if (baselineScenario?.id !== 'baseline' && 
      comparisonScenario?.id !== 'baseline' &&
      baselineScenario?.id === comparisonScenario?.id) {
    console.warn('Same scenario selected for both baseline and comparison');
  }

  // Use the time series data we already prepared above
  const baselineTimeSeries = baselineTimeSeriesData;
  const comparisonTimeSeries = comparisonTimeSeriesData;
  
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
      value: comparisonTimeSeries[nodeId] ? JSON.stringify(comparisonTimeSeries[nodeId]).substring(0, 100) + '...' : 'none'
    });
    
    if (comparisonTimeSeries[nodeId] && Array.isArray(comparisonTimeSeries[nodeId])) {
      const colorIndex = index % colors.length;
      
      datasets.push({
        label: `${nodeLabels[nodeId] || `Node ${nodeId}`} (${comparisonScenario?.name || 'Comparison'})`,
        data: comparisonTimeSeries[nodeId],
        borderColor: colors[colorIndex],
        backgroundColor: 'transparent',
        tension: 0.3,
      });
    }
  });

  // Chart options
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: 'Iterations',
          color: 'rgba(255, 255, 255, 0.7)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        min: 0,
        max: 1,
        title: {
          display: true,
          text: 'Concept Value',
          color: 'rgba(255, 255, 255, 0.7)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10,
          },
          boxWidth: 12,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleColor: 'white',
        bodyColor: 'white',
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${parseFloat(context.raw as string).toFixed(3)}`;
          }
        }
      }
    },
  };

  console.log('Chart data preparation:', {
    maxIterations: maxIterations, 
    labelCount: labels.length,
    nodeIdsFound: nodeIds,
    datasetsGenerated: datasets.length,
    baselineDatasetCount: nodeIds.filter(id => baselineTimeSeries[id] && Array.isArray(baselineTimeSeries[id])).length,
    comparisonDatasetCount: nodeIds.filter(id => comparisonTimeSeries[id] && Array.isArray(comparisonTimeSeries[id])).length
  });

  return (
    <Line
      options={options}
      data={{
        labels: labels,
        datasets: datasets
      }}
    />
  );
}