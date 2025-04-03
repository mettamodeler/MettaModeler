import { useState, useCallback } from 'react';
import { FCMModel, SimulationParams, SimulationResult, FCMNode } from '@/lib/types';
import { runSimulation, calculateChange } from '@/lib/simulation';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ConvergencePlot from './ConvergencePlot';
import ModelAnalysis from './ModelAnalysis';
import BaselineComparison from './BaselineComparison';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SimulationPanelProps {
  model: FCMModel;
}

export default function SimulationPanel({ model }: SimulationPanelProps) {
  const { toast } = useToast();
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    iterations: 20,
    threshold: 0.001,
    initialValues: {},
  });
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [showSimulationResults, setShowSimulationResults] = useState(false);
  
  // Create a map of node IDs to labels for display
  const nodeLabels = Object.fromEntries(
    model.nodes.map(node => [node.id, node.label])
  );
  
  // Map nodes by type for organizing the UI
  const driverNodes = model.nodes.filter(node => node.type === 'driver');
  const outcomeNodes = model.nodes.filter(node => node.type === 'outcome');
  const regularNodes = model.nodes.filter(node => node.type === 'regular');
  
  // Handle initial value changes for nodes
  const handleInitialValueChange = useCallback((nodeId: string, value: number) => {
    setSimulationParams(prev => ({
      ...prev,
      initialValues: {
        ...prev.initialValues,
        [nodeId]: value,
      },
    }));
  }, []);
  
  // Run simulation
  const handleRunSimulation = useCallback(() => {
    try {
      const result = runSimulation(model, simulationParams);
      setSimulationResult(result);
      setShowSimulationResults(true);
    } catch (error) {
      toast({
        variant: "destructive", 
        title: "Simulation Failed",
        description: error instanceof Error ? error.message : "An error occurred during simulation.",
      });
    }
  }, [model, simulationParams, toast]);
  
  // Save scenario
  const handleSaveScenario = useCallback(async () => {
    if (!simulationResult) return;
    
    try {
      const scenario = {
        name: scenarioName || `Scenario ${new Date().toLocaleString()}`,
        modelId: model.id,
        initialValues: simulationParams.initialValues || {},
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
      toast({
        variant: "destructive",
        title: "Failed to Save Scenario",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  }, [simulationResult, scenarioName, model.id, simulationParams.initialValues, toast]);
  
  return (
    <div className="relative h-full overflow-auto">
      <div className="p-6 grid grid-cols-1 gap-6">
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
                        value={simulationParams.initialValues?.[node.id] ?? node.value}
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
                        value={simulationParams.initialValues?.[node.id] ?? node.value}
                        onChange={handleInitialValueChange}
                      />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="settings">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="iterations">Max Iterations</Label>
                      <Input
                        id="iterations"
                        type="number"
                        value={simulationParams.iterations}
                        onChange={(e) => 
                          setSimulationParams(prev => ({
                            ...prev,
                            iterations: parseInt(e.target.value) || 20,
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
              
              <div className="mt-8">
                <Button 
                  className="w-full bg-secondary/20 hover:bg-secondary/30 text-secondary hover:text-white"
                  onClick={handleRunSimulation}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
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
          <DialogContent className="dark-glass border border-white/10 max-w-4xl">
            <DialogHeader>
              <DialogTitle>simulation results</DialogTitle>
              <DialogDescription>
                {simulationResult?.converged 
                  ? `Converged after ${simulationResult.iterations} iterations` 
                  : 'Maximum iterations reached without convergence'}
              </DialogDescription>
            </DialogHeader>
            
            {simulationResult && (
              <div className="space-y-6">
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
                      const initialValue = simulationParams.initialValues?.[node.id] ?? node.value;
                      const finalValue = simulationResult.finalValues[node.id] || 0;
                      const change = calculateChange(initialValue, finalValue);
                      
                      return (
                        <div key={node.id} className="glass p-3 rounded-md">
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-sm font-medium">{node.label}</div>
                            <div className="text-xs px-2 py-0.5 rounded bg-white/10 text-white">
                              {node.type}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl font-light">{finalValue.toFixed(2)}</div>
                            <div className={`flex items-center text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {change >= 0 ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="18 15 12 9 6 15"></polyline>
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                              )}
                              {change >= 0 ? '+' : ''}{change.toFixed(2)}
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
                
                {/* Save Scenario */}
                <div className="flex justify-between items-center">
                  <Input
                    placeholder="Enter scenario name..."
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    className="mr-2"
                  />
                  <Button onClick={handleSaveScenario}>
                    Save Scenario
                  </Button>
                </div>
              </div>
            )}
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
  return (
    <div>
      <div className="flex justify-between mb-1">
        <Label htmlFor={`node-${node.id}`}>{node.label}</Label>
        <span className={`text-xs px-2 py-0.5 rounded ${
          node.type === 'driver' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
        }`}>
          {node.type}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Slider
          id={`node-${node.id}`}
          value={[value]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(values) => onChange(node.id, values[0])}
        />
        <div className="w-12 text-center font-mono text-sm">
          {value.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
