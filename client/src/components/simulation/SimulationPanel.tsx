import { useState, useCallback, useEffect } from 'react';
import { FCMModel, SimulationParameters, SimulationResult, FCMNode } from '@/lib/types';
import { toStringId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import ConvergencePlot from './ConvergencePlot';
import ModelAnalysis from './ModelAnalysis';
import BaselineComparison from './BaselineComparison';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useBaseline } from '@/contexts/BaselineContext';
import { SimulationNode } from '../../types/simulation';
import { runSimulation as runSimulationFn } from '@/lib/simulation';

// Helper function to calculate impact (difference from baseline or initial value)
function calculateImpact(finalValue: number, baselineValue?: number, initialValue?: number): number {
  if (typeof baselineValue === 'number') {
    return finalValue - baselineValue;
  }
  // If there's no baseline value, this must be the baseline run, so impact is 0
  return 0;
}

// Helper function to check if any node values have been modified
function hasModifiedValues(initialValues: Record<string, number>, model: FCMModel): boolean {
  return Object.entries(initialValues).some(([nodeId, value]) => {
    const node = model.nodes.find(n => toStringId(n.id) === nodeId);
    return node && value !== node.value;
  });
}

interface SimulationNodeData {
  id: string;
  label: string;
  value: number;
}

type FinalStateValue = number | SimulationNodeData;

interface SimulationPanelProps {
  model: FCMModel;
}

export default function SimulationPanel({ model }: SimulationPanelProps) {
  // Guard: If model or model.nodes is missing or empty, show friendly message and do not run simulation logic
  if (!model || !model.nodes || model.nodes.length === 0) {
    return (
      <Card className="card h-full">
        <CardHeader>
          <CardTitle>simulation parameters</CardTitle>
          <CardDescription>Add nodes to your model to run a simulation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="nested-panel p-6 rounded-lg text-center text-[hsl(var(--muted-foreground))]">
            <p>Your model needs nodes before you can run a simulation.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { toast } = useToast();
  const { baselineResult, setBaselineResult, isBaselineValid, clearBaseline } = useBaseline();
  
  const [simulationParams, setSimulationParams] = useState<SimulationParameters>({
    maxIterations: 20,
    threshold: 0.001,
    activation: 'sigmoid',
  });
  const [initialValues, setInitialValues] = useState<Record<string, number>>({});
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [showSimulationResults, setShowSimulationResults] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Run simulation function
  const runSimulation = useCallback(async (isBaseline: boolean = false) => {
    if (isRunning) return;
    setIsRunning(true);
    setError(null);
    
    try {
      const result = await runSimulationFn(model, initialValues, simulationParams);
      
      if (isBaseline) {
        setBaselineResult(result, toStringId(model.id));
      } else {
        setSimulationResult(result);
        setShowSimulationResults(true);
      }
    } catch (error) {
      console.error('Simulation failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to run simulation');
      toast({
        variant: "destructive",
        title: "Simulation Failed",
        description: error instanceof Error ? error.message : 'An error occurred while running the simulation',
      });
    } finally {
      setIsRunning(false);
    }
  }, [model, initialValues, simulationParams, isRunning, setBaselineResult, toast]);

  // Effect to clear and recalculate baseline when model structure changes
  useEffect(() => {
    if (!isBaselineValid(model)) {
      console.log('Model changed, recalculating baseline');
      clearBaseline();
      runSimulation(true); // Force baseline calculation
    }
  }, [model, isBaselineValid, clearBaseline, runSimulation]);

  // Create a map of node IDs to labels for display
  const nodeLabels = Object.fromEntries(
    model.nodes.map(node => [toStringId(node.id), node.label])
  );
  
  // Map nodes by type for organizing the UI
  const driverNodes = model.nodes.filter(node => node.type === 'driver');
  const outcomeNodes = model.nodes.filter(node => node.type === 'outcome');
  const regularNodes = model.nodes.filter(node => node.type === 'regular');
  
  // Handle initial value changes for nodes
  const handleInitialValueChange = useCallback((nodeId: string, value: number) => {
    setInitialValues(prev => ({
      ...prev,
      [nodeId]: value,
    }));
    // Clear any previous errors when parameters change
    setError(null);
  }, []);
  
  // Save scenario
  const handleSaveScenario = useCallback(async () => {
    if (!simulationResult) return;
    
    try {
      if (!scenarioName.trim()) {
        throw new Error("Please enter a name for the scenario");
      }
      
      const scenario = {
        name: scenarioName.trim(),
        modelId: toStringId(model.id),
        initialValues: initialValues,
        results: simulationResult,
      };
      
      await apiRequest('POST', '/api/scenarios', scenario);
      
      toast({
        title: "Scenario Saved",
        description: `"${scenario.name}" has been saved successfully.`,
      });
      
      // Reset scenario name
      setScenarioName('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save scenario";
      toast({
        variant: "destructive",
        title: "Failed to Save Scenario",
        description: errorMessage,
      });
    }
  }, [simulationResult, scenarioName, model.id, initialValues, toast]);
  
  useEffect(() => {
    return () => {
      setSimulationResult(null);
      clearBaseline();
    };
  }, []);

  return (
    <div className="relative h-full overflow-auto">
      <div className="p-6 grid grid-cols-1 gap-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Baseline Status Alert */}
        {!baselineResult && (
          <Alert>
            <AlertTitle>Calculating Baseline</AlertTitle>
            <AlertDescription>
              The baseline simulation is running automatically. Any changes you make will be compared to this baseline.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Main Simulation Configuration and Analysis Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Simulation Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>simulation parameters</CardTitle>
              <CardDescription>Configure initial values and run settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="drivers">
                <TabsList className="mb-4">
                  <TabsTrigger value="drivers">driver nodes</TabsTrigger>
                  <TabsTrigger value="all">all nodes</TabsTrigger>
                  <TabsTrigger value="settings">settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="drivers">
                  <div className="space-y-4">
                    {driverNodes.map((node) => (
                      <NodeValueControl
                        key={node.id}
                        node={node}
                        value={initialValues?.[node.id] ?? node.value}
                        onChange={handleInitialValueChange}
                      />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="all">
                  <div className="space-y-4">
                    {model.nodes.map((node) => (
                      <NodeValueControl
                        key={node.id}
                        node={node}
                        value={initialValues?.[node.id] ?? node.value}
                        onChange={handleInitialValueChange}
                      />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="settings">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="maxIterations">Max Iterations</Label>
                      <Input
                        id="maxIterations"
                        type="number"
                        value={simulationParams.maxIterations}
                        onChange={(e) => 
                          setSimulationParams(prev => ({
                            ...prev,
                            maxIterations: parseInt(e.target.value) || 20,
                          }))
                        }
                        min={1}
                        max={100}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="threshold">Convergence Threshold</Label>
                      <Input
                        id="threshold"
                        type="number"
                        value={simulationParams.threshold}
                        onChange={(e) => 
                          setSimulationParams(prev => ({
                            ...prev,
                            threshold: parseFloat(e.target.value) || 0.001,
                          }))
                        }
                        min={0.0001}
                        max={0.1}
                        step={0.0001}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="mt-8 flex space-x-2">
                <Button 
                  onClick={() => runSimulation(true)}
                  disabled={isRunning}
                  variant="outline"
                >
                  Set as Baseline
                </Button>
                <Button 
                  onClick={() => runSimulation(false)}
                  disabled={isRunning}
                >
                  Run Simulation
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Model Analysis */}
          <ModelAnalysis model={model} />
        </div>
        
        {/* Simulation Results */}
        <Dialog open={showSimulationResults} onOpenChange={setShowSimulationResults}>
          <DialogContent className="dark-glass border border-white/10 max-w-4xl p-0 flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>simulation results</DialogTitle>
              <DialogDescription>
                {simulationResult?.converged 
                  ? `Converged after ${simulationResult.iterations} iterations` 
                  : 'Maximum iterations reached without convergence'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-32 pt-2" style={{ maxHeight: '60vh' }}>
              {simulationResult && (
                <>
                  {/* Convergence Chart */}
                  <div className="glass p-4 rounded-lg">
                    <ConvergencePlot 
                      simulationResult={simulationResult} 
                      nodeLabels={nodeLabels} 
                    />
                  </div>
                  {/* Final Node Values */}
                  <div className="glass p-4 rounded-lg">
                    <h3 className="text-sm font-semibold mb-3">final node values</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {model.nodes.map((node) => {
                        const nodeId = toStringId(node.id);
                        const finalValue = simulationResult.finalState[nodeId] as unknown as SimulationNode;
                        const baselineValue = simulationResult.baselineFinalState?.[nodeId] as unknown as SimulationNode | undefined;
                        const initialValue = simulationResult.initialValues[nodeId];
                        const formattedValue = finalValue.value.toFixed(3);
                        const impact = calculateImpact(finalValue.value, baselineValue?.value, initialValue);
                        
                        return (
                          <div key={nodeId} className="glass p-3 rounded-md">
                            <div className="flex justify-between items-center mb-1">
                              <div className="text-sm font-medium">{node.label}</div>
                              <div className="text-xs px-2 py-0.5 rounded bg-white/10 text-white">
                                {node.type}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl font-light">{formattedValue}</div>
                              <div className={`flex items-center text-xs ${impact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {impact >= 0 ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="18 15 12 9 6 15"></polyline>
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                  </svg>
                                )}
                                {impact >= 0 ? '+' : ''}{impact.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Baseline Comparison (only shown if there's baseline data) */}
                  {simulationResult.baselineFinalState && (
                    <BaselineComparison 
                      model={model}
                      result={simulationResult}
                    />
                  )}
                </>
              )}
            </div>
            {/* Sticky Save Scenario Bar */}
            <div className="w-full bg-background/80 backdrop-blur p-4 border-t border-white/10 flex justify-between items-center z-10" style={{ position: 'relative' }}>
              <Input
                placeholder="Enter scenario name..."
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="mr-2"
              />
              <Button 
                onClick={handleSaveScenario}
                disabled={!scenarioName.trim()}
              >
                Save Scenario
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Helper component for node value controls
interface NodeValueControlProps {
  node: FCMNode;
  value: number;
  onChange: (nodeId: string, value: number) => void;
}

function NodeValueControl({ node, value, onChange }: NodeValueControlProps) {
  const nodeId = toStringId(node.id);
  
  return (
    <div>
      <div className="flex justify-between mb-1">
        <Label htmlFor={`node-${nodeId}`}>{node.label}</Label>
        <span className={`text-xs px-2 py-0.5 rounded ${
          node.type === 'driver' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
        }`}>
          {node.type}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Slider
          id={`node-${nodeId}`}
          value={[value]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(values) => onChange(nodeId, values[0])}
        />
        <div className="w-12 text-center font-mono text-sm">
          {value.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
