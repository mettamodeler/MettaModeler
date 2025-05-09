import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { 
  FCMModel, 
  SimulationResult,
  SimulationNode
} from '@shared/schema';
import { SimulationResultWithComparison, isComparisonSimulationResult, ComparisonSimulationResult, FCMNode } from '@/lib/types';
import { toStringId } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Cell, Legend } from 'recharts';
import { CompareConvergencePlot } from './CompareConvergencePlot';
import * as Select from '@radix-ui/react-select';
import { ChevronDownIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { runSimulation as runSimulationApi } from '@/lib/simulation';
import { FaLock } from 'react-icons/fa';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Bar as ChartJsBar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartJsTooltip,
  Legend as ChartJsLegend,
  ChartData as ChartJsData,
  ChartOptions as ChartJsOptions,
} from 'chart.js';
import * as Popover from '@radix-ui/react-popover';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface ScenarioComparisonProps {
  model: FCMModel;
  scenarios: Array<{
    id: string;
    name: string;
    initialValues: Record<string, number>;
    clampedNodes?: string[];
  }>;
  nodeLabelsById?: Record<string, string>;
  nodeTypesById?: Record<string, string>;
  scenarioTab: string;
  setScenarioTab: React.Dispatch<React.SetStateAction<string>>;
}

const CHART_COLOR_PALETTE = [
  '#60a5fa', // blue-400
  '#f472b6', // pink-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#f87171', // red-400
  '#a78bfa', // purple-400
  '#38bdf8', // sky-400
  '#facc15', // yellow-400
  '#4ade80', // green-400
  '#f472b6', // rose-400
];

const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({ model, scenarios, nodeLabelsById, nodeTypesById, scenarioTab, setScenarioTab }) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [comparisonResult, setComparisonResult] = useState<SimulationResult | ComparisonSimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  type ActivationType = 'sigmoid' | 'tanh' | 'relu' | 'linear';
  const [activation, setActivation] = useState<ActivationType>('sigmoid');
  
  const selectedScenario = useMemo(() => 
    scenarios.find((s: { id: string }) => s.id.toString() === selectedScenarioId),
    [scenarios, selectedScenarioId]
  );

  // Initialize selected scenario
  useEffect(() => {
    if (scenarios.length > 0) {
      setSelectedScenarioId(scenarios[0].id.toString());
    }
  }, [scenarios]);

  // Get node labels and colors
  const { nodeLabels, nodeColors } = useMemo<{
    nodeLabels: Record<string, string>;
    nodeColors: Record<string, string>;
  }>(() => {
    const labels: Record<string, string> = {};
    const colors: Record<string, string> = {};
    model.nodes.forEach((node: FCMNode, index: number) => {
      const nodeId = toStringId(node.id);
      labels[nodeId] = node.label;
      colors[nodeId] = CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length];
    });
    return { nodeLabels: labels, nodeColors: colors };
  }, [model.nodes]);

  // Run simulation when scenario changes
  useEffect(() => {
    if (!selectedScenario) {
      setComparisonResult(null);
      return;
    }

    // Log selected scenario for audit
    console.log('Selected scenario for comparison:', selectedScenario);

    const runComparison = async () => {
      setIsLoading(true);
      try {
        // Extract model's default node values
        const modelDefaults = Object.fromEntries(
          model.nodes.map(node => [toStringId(node.id), node.value])
        );
        // Extract scenario's node values
        const scenarioValues = Object.fromEntries(
          model.nodes.map(node => [
            toStringId(node.id),
            selectedScenario.initialValues[toStringId(node.id)] ?? node.value
          ])
        );
        // Log for audit
        console.log('runComparison: modelInitialValues', modelDefaults);
        console.log('runComparison: scenarioInitialValues', scenarioValues);
        console.log('runComparison: clampedNodes', selectedScenario.clampedNodes);
        // Call simulation API with both sets
        const result = await runSimulationApi(
          model,
          scenarioValues,
          {
            compareToBaseline: true,
            modelInitialValues: modelDefaults,
            scenarioInitialValues: scenarioValues,
            clampedNodes: selectedScenario.clampedNodes,
            activation
          }
        );
        
        console.log('Received comparison result:', result);
        
        // Ensure the result is a comparison result
        if (isComparisonSimulationResult(result)) {
          console.log('Baseline time series:', result.baselineTimeSeries);
          console.log('Scenario time series:', result.comparisonTimeSeries);
          setComparisonResult(result);
        } else {
          console.error('Expected a comparison result, but received a single result.');
          setComparisonResult(null);
        }
      } catch (error) {
        console.error('Failed to run scenario comparison:', error);
        setComparisonResult(null);
      } finally {
        setIsLoading(false);
      }
    };
    runComparison();
  }, [selectedScenario, model, activation]);

  // Debug: log when comparisonResult changes
  useEffect(() => {
    console.log('comparisonResult changed:', comparisonResult);
  }, [comparisonResult]);

  // Calculate delta data for the bar chart
  const deltaData = useMemo(() => {
    if (!comparisonResult || !isComparisonSimulationResult(comparisonResult)) {
      return [];
    }

    return model.nodes.map((node: FCMNode) => {
      const nodeId = toStringId(node.id);
      const baselineNode = comparisonResult.baselineFinalState[nodeId];
      const comparisonNode = comparisonResult.comparisonFinalState[nodeId];
      
      const baselineValue = baselineNode?.value;
      const comparisonValue = comparisonNode?.value;
      
      if (baselineValue === undefined || comparisonValue === undefined) {
        return null;
      }
            
      return {
        name: node.label,
        nodeId,
        baseline: baselineValue,
        comparison: comparisonValue,
        delta: comparisonValue - baselineValue,
        type: node.type || 'regular'
      };
    }).filter((row: any): row is NonNullable<typeof row> => row !== null);
  }, [comparisonResult, model.nodes]);

  // Calculate delta over time data
  const deltaOverTimeData = useMemo(() => {
    if (!comparisonResult || !isComparisonSimulationResult(comparisonResult)) {
      console.log('No valid comparison result available');
      return [];
    }

    const comparisonTimeSeries = comparisonResult.comparisonTimeSeries;
    const baselineTimeSeries = comparisonResult.baselineTimeSeries;

    // Debug: Log the raw time series data with more detail
    console.log('DEBUG: Raw Time Series Data', {
      baseline: baselineTimeSeries,
      comparison: comparisonTimeSeries,
      nodeCount: model.nodes.length,
      baselineNodeCount: Object.keys(baselineTimeSeries).length,
      comparisonNodeCount: Object.keys(comparisonTimeSeries).length
    });

    // Log each node's data separately for clarity
    model.nodes.forEach((node: FCMNode) => {
      const nodeId = toStringId(node.id);
      console.log(`Node ${node.label} (${nodeId}) data:`, {
        baseline: baselineTimeSeries[nodeId] || [],
        comparison: comparisonTimeSeries[nodeId] || [],
        baselineLength: (baselineTimeSeries[nodeId] || []).length,
        comparisonLength: (comparisonTimeSeries[nodeId] || []).length
      });
    });

    const maxIterations = Math.max(
      ...Object.values(comparisonTimeSeries).map((arr: number[]) => arr.length),
      ...Object.values(baselineTimeSeries).map((arr: number[]) => arr.length)
    );

    console.log('Max iterations:', maxIterations);

    const result = Array.from({ length: maxIterations }, (_, iteration) => {
      const dataPoint: any = { iteration };
      
      model.nodes.forEach((node: FCMNode) => {
        const nodeId = toStringId(node.id);
        const baselineValues = baselineTimeSeries[nodeId] || [];
        const comparisonValues = comparisonTimeSeries[nodeId] || [];
        
        // Calculate delta for this iteration
        if (baselineValues[iteration] !== undefined && comparisonValues[iteration] !== undefined) {
          const baselineValue = baselineValues[iteration];
          const comparisonValue = comparisonValues[iteration];
          dataPoint[nodeId] = comparisonValue - baselineValue;
          
          // Debug log for this node's delta calculation
          console.log(`Iteration ${iteration}, Node ${node.label}:`, {
            baseline: baselineValue,
            comparison: comparisonValue,
            delta: dataPoint[nodeId],
            nodeId: nodeId
          });
        } else {
          // If we're beyond the available data, use the last known values
          const lastBaseline = baselineValues[baselineValues.length - 1] || 0;
          const lastComparison = comparisonValues[comparisonValues.length - 1] || 0;
          dataPoint[nodeId] = lastComparison - lastBaseline;
          
          // Debug log for extrapolated values
          console.log(`Iteration ${iteration}, Node ${node.label} (extrapolated):`, {
            baseline: lastBaseline,
            comparison: lastComparison,
            delta: dataPoint[nodeId],
            nodeId: nodeId
          });
        }
      });
      
      return dataPoint;
    });

    // Debug: Log the calculated delta data with more detail
    console.log('DEBUG: Calculated Delta Over Time Data', {
      length: result.length,
      firstPoint: result[0],
      lastPoint: result[result.length - 1],
      allPoints: result
    });

    return result;
  }, [model.nodes, comparisonResult]);

  // Extract impact metrics from comparisonResult
  const impactMetrics = useMemo(() => {
    if (!comparisonResult || !(comparisonResult as any).impactMetrics) return [];
    const metrics = (comparisonResult as any).impactMetrics;
    return model.nodes.map((node: FCMNode) => {
      const nodeId = toStringId(node.id);
      return metrics[nodeId] || null;
    }).filter(Boolean);
  }, [comparisonResult, model.nodes]);

  if (scenarios.length === 0) {
    return (
      <Card className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
        <CardHeader>
          <CardTitle>scenario comparison</CardTitle>
          <CardDescription>No scenarios available to compare</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Debug: log the simulation result for troubleshooting
  console.log('ScenarioComparison: comparisonResult', comparisonResult);
  if (comparisonResult) {
    const cr = comparisonResult as SimulationResultWithComparison;
    const nodeIds = Object.keys(cr.comparisonTimeSeries || {});
    if (nodeIds.length > 0) {
      const firstNode = nodeIds[0];
      const secondNode = nodeIds[1];
      console.log('comparisonTimeSeries[firstNode]', firstNode, cr.comparisonTimeSeries?.[firstNode]);
      console.log('baselineTimeSeries[firstNode]', firstNode, cr.baselineTimeSeries?.[firstNode]);
      if (secondNode) {
        console.log('comparisonTimeSeries[secondNode]', secondNode, cr.comparisonTimeSeries?.[secondNode]);
        console.log('baselineTimeSeries[secondNode]', secondNode, cr.baselineTimeSeries?.[secondNode]);
      }
    }
  }

  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    ChartJsTooltip,
    ChartJsLegend
  );

  return (
    <TooltipProvider>
      <Card className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
        <CardContent>
          <div className="space-y-6">
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Select.Root value={activation} onValueChange={value => setActivation(value as ActivationType)}>
                  <Select.Trigger className="w-[160px] flex items-center justify-between px-3 py-2 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-md shadow-sm text-[hsl(var(--foreground))]">
                    <Select.Value>
                      {activation.charAt(0).toUpperCase() + activation.slice(1)}
                    </Select.Value>
                    <Select.Icon>
                      <ChevronDownIcon className="text-[hsl(var(--muted-foreground))]" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-md shadow-lg">
                      <Select.Viewport>
                        <Select.Item value="sigmoid" className="px-3 py-2 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] cursor-pointer outline-none focus:bg-[hsl(var(--muted))]">
                          <Select.ItemText>Sigmoid</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="tanh" className="px-3 py-2 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] cursor-pointer outline-none focus:bg-[hsl(var(--muted))]">
                          <Select.ItemText>Tanh</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="relu" className="px-3 py-2 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] cursor-pointer outline-none focus:bg-[hsl(var(--muted))]">
                          <Select.ItemText>ReLU</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
                {/* Two icons: Tooltip for hover, Popover for click, stacked for perfect UX */}
                <div className="relative" style={{ width: 20, height: 20 }}>
                  {/* Tooltip icon (shows on hover, hidden when popover is open) */}
                  <TooltipPrimitive.Root delayDuration={200}>
                    <TooltipPrimitive.Trigger asChild>
                      <span
                        className="absolute inset-0 ml-1 cursor-pointer text-blue-400 z-10"
                        tabIndex={0}
                        style={{ pointerEvents: 'auto' }}
                        id="activation-info-tooltip"
                      >
                        <InfoCircledIcon />
                      </span>
                    </TooltipPrimitive.Trigger>
                    <TooltipPrimitive.Portal>
                      <TooltipPrimitive.Content sideOffset={8} className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-xs text-gray-200 shadow-lg z-50">
                        Which activation fits your scenario? <span className="text-gray-400">(Click for details)</span>
                      </TooltipPrimitive.Content>
                    </TooltipPrimitive.Portal>
                  </TooltipPrimitive.Root>
                  {/* Popover icon (shows on click, overlays tooltip icon) */}
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <span
                        className="absolute inset-0 ml-1 cursor-pointer text-blue-400 z-20"
                        tabIndex={0}
                        style={{ pointerEvents: 'auto' }}
                        aria-label="Show activation function details"
                      >
                        <InfoCircledIcon />
                      </span>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content sideOffset={8} className="max-w-xs rounded-lg shadow-lg bg-gray-900 border border-gray-700 p-4 text-sm text-gray-200 z-50">
                        <div className="mb-2 font-semibold">Activation Function</div>
                        <div className="mb-3">
                          <div className="mb-2"><b>Sigmoid - Gradual Growth</b><br />
                          Starts slow, speeds up, then levels off<br />
                          Like awareness or trust building over time<br />
                          <span className="text-gray-400">Use when: There's a natural limit</span></div>
                          <div className="mb-2"><b>Tanh - Balanced Influence</b><br />
                          Works in both positive and negative directions<br />
                          Like public opinion or market reactions<br />
                          <span className="text-gray-400">Use when: Effects can swing both ways</span></div>
                          <div className="mb-2"><b>ReLU - Threshold Effect</b><br />
                          Nothing happens until a tipping point<br />
                          Like policy triggers or sudden changes<br />
                          <span className="text-gray-400">Use when: There's a clear on/off switch</span></div>
                        </div>
                        <div className="mt-4 text-xs text-blue-300">
                          Tip: Think about how this relationship works in real life - does it gradually slow down, swing both ways, or suddenly activate?
                        </div>
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>
              </div>
              <Select.Root value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
                <Select.Trigger className="w-[200px] flex items-center justify-between px-3 py-2 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-md shadow-sm text-[hsl(var(--foreground))]">
                  <Select.Value>
                    {selectedScenario?.name || "Select a scenario"}
                  </Select.Value>
                  <Select.Icon>
                    <ChevronDownIcon className="text-[hsl(var(--muted-foreground))]" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-md shadow-lg">
                    <Select.Viewport>
                      {scenarios.map((scenario) => (
                        <Select.Item 
                          key={scenario.id} 
                          value={scenario.id.toString()}
                          className={`px-3 py-2 text-[hsl(var(--foreground))] cursor-pointer outline-none focus:bg-[hsl(var(--muted))] ${selectedScenarioId === scenario.id.toString() ? 'bg-[hsl(var(--muted))]' : 'bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]'}`}
                        >
                          <Select.ItemText>{scenario.name}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <p className="text-[hsl(var(--muted-foreground))]">Running simulation...</p>
              </div>
            ) : (
              <div className="tab-bar mt-6 mb-2">
                <Tabs value={scenarioTab} onValueChange={setScenarioTab}>
                  <TabsList className="tab-bar">
                    <TabsTrigger value="chart" className={`tab${scenarioTab === 'chart' ? ' active' : ''}`}>Chart</TabsTrigger>
                    <TabsTrigger value="convergence" className={`tab${scenarioTab === 'convergence' ? ' active' : ''}`}>Convergence</TabsTrigger>
                    <TabsTrigger value="delta" className={`tab${scenarioTab === 'delta' ? ' active' : ''}`}>Delta Over Time</TabsTrigger>
                    <TabsTrigger value="maxdiff" className={`tab${scenarioTab === 'maxdiff' ? ' active' : ''}`}>Max Diff</TabsTrigger>
                    <TabsTrigger value="table" className={`tab${scenarioTab === 'table' ? ' active' : ''}`}>Table</TabsTrigger>
                  </TabsList>

                  <TabsContent value="chart">
                    <CardDescription className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
                      Shows the final difference between baseline and scenario values for each node. Positive values indicate increase, negative values indicate decrease.
                    </CardDescription>
                    {scenarioTab === 'chart' && deltaData.length > 0 ? (
                      <div className="h-[400px] w-full bg-[hsl(var(--card))] rounded-lg p-4">
                        <ChartJsBar
                          data={{
                            labels: deltaData.map((row: any) => row.name),
                            datasets: [
                              {
                                label: 'Difference',
                                data: deltaData.map((row: any) => row.delta),
                                backgroundColor: deltaData.map((row: any) => getBarColor(row.delta)),
                                borderColor: deltaData.map((row: any) => getBarColor(row.delta)),
                                borderWidth: 1,
                              },
                            ],
                          } as ChartJsData<'bar'>}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: true,
                                position: 'right',
                                labels: {
                                  padding: 20,
                                  usePointStyle: true,
                                  pointStyle: 'rect',
                                },
                              },
                              title: {
                                display: true,
                                text: 'Scenario Comparison',
                                padding: 20,
                              },
                              tooltip: {
                                callbacks: {
                                  label: (context: any) => {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    return `${label}: ${value.toFixed(3)}`;
                                  },
                                },
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: 'Delta',
                                  padding: 20,
                                },
                                grid: {
                                  color: 'rgba(255, 255, 255, 0.1)',
                                },
                              },
                              x: {
                                title: {
                                  display: true,
                                  text: 'Node',
                                  padding: 20,
                                },
                                grid: {
                                  color: 'rgba(255, 255, 255, 0.1)',
                                },
                              },
                            },
                          } as ChartJsOptions<'bar'>}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[400px]">
                        <p className="text-[hsl(var(--muted-foreground))]">No comparison data available</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="convergence">
                    <CardDescription className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
                      Displays how each node's value changes over time, comparing baseline (dashed) and scenario (solid) trajectories.
                    </CardDescription>
                    {scenarioTab === 'convergence' && comparisonResult && isComparisonSimulationResult(comparisonResult) && (
                      <div className="mt-4 bg-[hsl(var(--card))] rounded-lg p-4">
                        <CompareConvergencePlot
                          simulationResult={comparisonResult}
                          nodeLabels={nodeLabels}
                          nodeColors={nodeColors}
                        />
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="delta">
                    <CardDescription className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
                      Shows how the difference between baseline and scenario evolves over time. Each line represents a node's changing impact.
                    </CardDescription>
                    {scenarioTab === 'delta' && deltaOverTimeData.length > 0 ? (
                      <div className="h-[400px] w-full bg-[hsl(var(--card))] rounded-lg p-4">
                        <ResponsiveContainer>
                          <LineChart data={deltaOverTimeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis 
                              dataKey="iteration"
                              label={{ 
                                value: 'Iterations', 
                                position: 'bottom',
                                fill: '#9ca3af',
                                style: { fontSize: '12px' }
                              }}
                              stroke="#9ca3af"
                              tick={{ fill: '#9ca3af' }}
                            />
                            <YAxis 
                              label={{ 
                                value: 'Difference from Baseline', 
                                angle: -90, 
                                position: 'insideLeft',
                                fill: '#9ca3af',
                                style: { fontSize: '12px' }
                              }}
                              stroke="#9ca3af"
                              tick={{ fill: '#9ca3af' }}
                            />
                            <RechartsTooltip 
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-gray-800/90 p-3 border border-gray-700 rounded-lg shadow-lg">
                                      <p className="text-sm text-gray-300 mb-2">Iteration: {label}</p>
                                      {payload.map((entry: any, index: number) => (
                                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                                          {entry.name}: {entry.value.toFixed(3)}
                                        </p>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend 
                              wrapperStyle={{
                                paddingTop: '20px',
                                color: '#9ca3af'
                              }}
                            />
                            {model.nodes.map((node) => {
                              const nodeId = toStringId(node.id);
                              return (
                                <Line
                                  key={nodeId}
                                  type="monotone"
                                  dataKey={nodeId}
                                  name={node.label}
                                  stroke={nodeColors[nodeId]}
                                  strokeWidth={2}
                                  dot={false}
                                  animationDuration={1000}
                                  animationBegin={0}
                                  animationEasing="ease-out"
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[400px]">
                        <p className="text-[hsl(var(--muted-foreground))]">No delta over time data available</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="maxdiff">
                    <CardDescription className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
                      Displays the maximum difference reached between baseline and scenario for each node, highlighting peak impacts.
                    </CardDescription>
                    {scenarioTab === 'maxdiff' && impactMetrics.length > 0 ? (
                      <div className="h-[400px] w-full bg-[hsl(var(--card))] rounded-lg p-4">
                        <ResponsiveContainer>
                          <BarChart data={impactMetrics}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="maxDifference" name="Max Diff">
                              {impactMetrics.map((entry, index) => (
                                <Cell key={`cell-maxdiff-${index}`} fill={
                                  entry.maxDifference > 0 ? '#22c55e' : entry.maxDifference < 0 ? '#ef4444' : '#6b7280'
                                } />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[400px]">
                        <p className="text-[hsl(var(--muted-foreground))]">No max difference data available</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="table">
                    <CardDescription className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
                      Detailed comparison showing baseline values, scenario values, differences, and key metrics for each node. Clamped nodes are marked with a lock icon. Direction indicates the pattern of change over time. Normalized % Change is the percent change relative to the larger of the baseline or scenario value.
                    </CardDescription>
                    {scenarioTab === 'table' && deltaData.length > 0 ? (
                      <div className="mt-2 bg-[hsl(var(--card))] rounded-lg overflow-hidden border border-[hsl(var(--border))]">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-[hsl(var(--table-header-bg))]">
                              <th className="px-3 py-2 text-left text-[hsl(var(--muted-foreground))]">Node</th>
                              <th className="px-3 py-2 text-left text-[hsl(var(--muted-foreground))]">Baseline</th>
                              <th className="px-3 py-2 text-left text-[hsl(var(--muted-foreground))]">Scenario</th>
                              <th className="px-3 py-2 text-left text-[hsl(var(--muted-foreground))]">Delta</th>
                              <th className="px-3 py-2 text-left text-[hsl(var(--muted-foreground))]">Normalized % Change</th>
                              <th className="px-3 py-2 text-left text-[hsl(var(--muted-foreground))]">AUC</th>
                              <th className="px-3 py-2 text-left text-[hsl(var(--muted-foreground))]">Max Diff</th>
                              <th className="px-3 py-2 text-left text-[hsl(var(--muted-foreground))]">Direction</th>
                            </tr>
                          </thead>
                          <tbody>
                            {impactMetrics.length > 0 ? impactMetrics.map((row: any) => (
                              <tr key={row.id} className="border-t border-gray-700">
                                <td className="px-3 py-2 flex items-center gap-2">
                                  {row.label}
                                  {Array.isArray((comparisonResult as any)?.clampedNodes) && (comparisonResult as any).clampedNodes.includes(row.id) && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span><FaLock className="text-blue-400 ml-1" /></span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Clamped during scenario
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </td>
                                <td className="px-3 py-2">{row.baseline?.toFixed(3)}</td>
                                <td className="px-3 py-2">{row.scenario?.toFixed(3)}</td>
                                <td className="px-3 py-2">{row.delta?.toFixed(3)}</td>
                                <td className="px-3 py-2">{row.normalizedChangePercent === null ? '—' : `${row.normalizedChangePercent.toFixed(1)}%`}</td>
                                <td className="px-3 py-2">{row.auc?.toFixed(3)}</td>
                                <td className="px-3 py-2">{row.maxDifference?.toFixed(3)}</td>
                                <td className="px-3 py-2">{row.direction}</td>
                              </tr>
                            )) : deltaData.map((row: any) => (
                              <tr key={row.nodeId} className="border-t border-gray-700">
                                <td className="px-3 py-2 flex items-center gap-2">
                                  {row.name}
                                  {Array.isArray((comparisonResult as any)?.clampedNodes) && (comparisonResult as any).clampedNodes.includes(row.nodeId) && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span><FaLock className="text-blue-400 ml-1" /></span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Clamped during scenario
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </td>
                                <td className="px-3 py-2">{row.baseline.toFixed(3)}</td>
                                <td className="px-3 py-2">{row.comparison.toFixed(3)}</td>
                                <td className="px-3 py-2">{row.delta.toFixed(3)}</td>
                                <td className="px-3 py-2">—</td>
                                <td className="px-3 py-2">—</td>
                                <td className="px-3 py-2">—</td>
                                <td className="px-3 py-2">—</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[200px]">
                        <p className="text-[hsl(var(--muted-foreground))]">No table data available</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

// Helper functions
function getBarColor(delta: number): string {
  if (delta > 0) return '#22c55e'; // green
  if (delta < 0) return '#ef4444'; // red
  return '#6b7280'; // gray
}

export default ScenarioComparison;