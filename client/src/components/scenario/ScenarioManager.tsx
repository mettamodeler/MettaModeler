import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useSimulation } from "@/hooks/use-simulation";
import { format } from "date-fns";
import { FCMModel, FCMNode } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import ScenarioComparison from "./ScenarioComparison";
import { FaLock, FaLockOpen, FaInfoCircle } from 'react-icons/fa';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface Scenario {
  id: string;
  name: string;
  initialValues: Record<string, number>;
  clampedNodes?: string[];
  results: any;
  createdAt: string;
}

interface ScenarioManagerProps {
  model: FCMModel;
  selectedScenarioIds: Set<string>;
  setSelectedScenarioIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  scenarioTab: string;
  setScenarioTab: React.Dispatch<React.SetStateAction<string>>;
}

// Export validation function
export const validateInitialValues = (values: Record<string, number>, nodes: FCMNode[]) => {
  const missingNodes = nodes.filter(node => values[node.id] === undefined);
  if (missingNodes.length > 0) {
    throw new Error(`Missing initial values for nodes: ${missingNodes.map(n => n.label).join(', ')}`);
  }
};

export default function ScenarioManager({ model, selectedScenarioIds, setSelectedScenarioIds, scenarioTab, setScenarioTab }: ScenarioManagerProps) {
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [newScenarioDialogOpen, setNewScenarioDialogOpen] = useState(false);
  const [createScenarioLoading, setCreateScenarioLoading] = useState(false);
  const [deleteScenarioId, setDeleteScenarioId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");
  const [initialValues, setInitialValues] = useState<Record<string, number>>({});
  const { runSimulation, updateParams } = useSimulation(model);
  const [clampedNodes, setClampedNodes] = useState<string[]>([]);
  const [showClampHelp, setShowClampHelp] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  // Fetch scenarios when model changes
  useEffect(() => {
    fetchScenarios();
  }, [model.id]);

  // Initialize initial values from model's node values
  useEffect(() => {
    const values: Record<string, number> = {};
    model.nodes.forEach(node => {
      values[node.id] = node.value;
    });
    setInitialValues(values);
  }, [model.nodes]);

  // Fetch scenarios from API
  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/models/${model.id}/scenarios`);
      if (!response.ok) throw new Error("Failed to fetch scenarios");
      
      const data = await response.json();
      console.log("Fetched scenarios:", data);
      setScenarios(data);
    } catch (error) {
      console.error("Error fetching scenarios:", error);
      toast({
        title: "Error",
        description: "Failed to load scenarios. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle clamping for a node
  const toggleClamp = (nodeId: string) => {
    setClampedNodes(prev =>
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    );
  };

  // Create new scenario
  const createScenario = async () => {
    if (!newScenarioName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a scenario name",
        variant: "destructive"
      });
      return;
    }
    try {
      validateInitialValues(initialValues, model.nodes);
      setCreateScenarioLoading(true);
      // Update simulation parameters with initial values and clamped nodes
      updateParams({ 
        initialValues, 
        clampedNodes,
        activation: 'sigmoid',
        threshold: 0.001,
        maxIterations: 20
      });
      // Run the simulation with clampedNodes
      const results = await runSimulation({ clampedNodes });
      if (!results) {
        throw new Error("Simulation failed to complete");
      }
      console.log('Full simulation results:', JSON.stringify(results, null, 2));
      const response = await apiRequest(
        "POST",
        "/api/scenarios",
        {
          name: newScenarioName,
          modelId: model.id,
          description: "",
          nodes: model.nodes.map(node => ({
            id: node.id,
            label: node.label,
            value: initialValues[node.id] || 0
          })),
          initialValues,
          clampedNodes,
          results: {
            finalState: results.finalState,
            timeSeries: results.timeSeries,
            iterations: results.iterations,
            converged: results.converged
          },
          simulationParams: {
            activation: 'sigmoid',
            threshold: 0.001,
            maxIterations: 20
          }
        }
      );
      setScenarios(prev => [...prev, response]);
      setNewScenarioName("");
      setNewScenarioDialogOpen(false);
      toast({
        title: "Success",
        description: "Scenario created successfully"
      });
    } catch (error) {
      console.error("Error creating scenario:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create scenario. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCreateScenarioLoading(false);
    }
  };

  // Delete scenario
  const deleteScenario = async () => {
    if (!deleteScenarioId || deleteLoading) return;
    
    setDeleteLoading(true);
    try {
      await apiRequest(
        "DELETE", 
        `/api/scenarios/${deleteScenarioId}`
      );
      
      // Remove from scenarios list
      setScenarios(prev => prev.filter(s => s.id !== deleteScenarioId));
      
      // Remove from selected scenarios if present
      if (selectedScenarioIds.has(deleteScenarioId)) {
        const newSelected = new Set(selectedScenarioIds);
        newSelected.delete(deleteScenarioId);
        setSelectedScenarioIds(newSelected);
      }
      
      // Close dialog
      setDeleteDialogOpen(false);
      setDeleteScenarioId(null);
      
      toast({
        title: "Success",
        description: "Scenario deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting scenario:", error);
      toast({
        title: "Error",
        description: "Failed to delete scenario. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Toggle scenario selection
  const toggleScenarioSelection = (scenario: Scenario) => {
    const newSelected = new Set(selectedScenarioIds);
    
    if (newSelected.has(scenario.id)) {
      newSelected.delete(scenario.id);
    } else {
      newSelected.add(scenario.id);
    }
    
    setSelectedScenarioIds(newSelected);
  };

  // Handle initial value change
  const handleInitialValueChange = (nodeId: string, value: number) => {
    setInitialValues(prev => ({
      ...prev,
      [nodeId]: value
    }));
  };

  // Filter scenarios based on selection
  const selectedScenariosList = scenarios.filter(s => selectedScenarioIds.has(s.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold lowercase text-[hsl(var(--foreground))]">scenarios</h3>
        <Button className="bg-[var(--metta-blue)] text-white px-4 py-2 rounded-md hover:bg-[var(--metta-blue)]/90" onClick={() => setNewScenarioDialogOpen(true)}>New Scenario</Button>
      </div>
      {loading ? (
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center">
          <p className="text-[hsl(var(--muted-foreground))]">Loading scenarios...</p>
        </div>
      ) : scenarios.length === 0 ? (
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center">
          <p className="text-[hsl(var(--muted-foreground))]">No scenarios found for this model.</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
            Create a scenario to run simulations with different initial values.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--table-header-bg))]">
                  <th className="p-3 text-left font-medium text-[hsl(var(--muted-foreground))] lowercase">name</th>
                  <th className="p-3 text-left font-medium text-[hsl(var(--muted-foreground))] lowercase">created</th>
                  <th className="p-3 text-left font-medium text-[hsl(var(--muted-foreground))] lowercase">status</th>
                  <th className="p-3 text-left font-medium text-[hsl(var(--muted-foreground))] lowercase">actions</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario) => (
                  <tr 
                    key={scenario.id}
                    className={`border-b border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--muted))]/10 ${selectedScenarioIds.has(scenario.id) ? "bg-[hsl(var(--primary))/20]" : ""}`}
                  >
                    <td className="p-3 font-medium text-[hsl(var(--foreground))]">{scenario.name}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">
                      {format(new Date(scenario.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="p-3">
                      {scenario.results ? (
                        <span className="inline-block px-2 py-1 rounded bg-[var(--metta-blue)] text-white text-xs font-semibold lowercase">{scenario.results.converged ? "converged" : "not converged"}</span>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] lowercase">no results</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button 
                          className={`px-3 py-1 rounded bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-sm border-none hover:bg-[hsl(var(--primary))]/10 ${selectedScenarioIds.has(scenario.id) ? 'opacity-70' : ''}`}
                          variant="secondary"
                          size="sm"
                          onClick={() => toggleScenarioSelection(scenario)}
                        >
                          {selectedScenarioIds.has(scenario.id) ? "deselect" : "select"}
                        </Button>
                        <Button 
                          className="px-3 py-1 rounded bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] text-sm border-none hover:bg-[hsl(var(--destructive))]/80"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setDeleteScenarioId(scenario.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedScenariosList.length > 0 && (
            <div className="mt-6 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
              <h3 className="text-lg font-semibold mb-2 lowercase text-[hsl(var(--foreground))]">comparison controls</h3>
              <div className="text-sm text-[hsl(var(--muted-foreground))] mb-4">select activation function and scenario to compare</div>
              <ScenarioComparison 
                scenarios={selectedScenariosList}
                model={model}
                nodeLabelsById={model.nodes.reduce((acc, node) => {
                  acc[node.id] = node.label;
                  return acc;
                }, {} as Record<string, string>)}
                nodeTypesById={model.nodes.reduce((acc, node) => {
                  acc[node.id] = node.type || 'regular';
                  return acc;
                }, {} as Record<string, string>)}
                scenarioTab={scenarioTab}
                setScenarioTab={setScenarioTab}
                selectedScenarioId={selectedScenarioId}
                setSelectedScenarioId={setSelectedScenarioId}
              />
            </div>
          )}
        </>
      )}
      
      {/* New Scenario Dialog */}
      <Dialog open={newScenarioDialogOpen} onOpenChange={setNewScenarioDialogOpen}>
        <TooltipProvider>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Scenario</DialogTitle>
              <DialogDescription>
                Set initial node values for your simulation scenario.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="scenario-name">Scenario Name</Label>
                  <Input
                    id="scenario-name"
                    className="mt-1"
                    value={newScenarioName}
                    onChange={(e) => setNewScenarioName(e.target.value)}
                    placeholder="Enter a name for this scenario"
                  />
                </div>
                
                <div className="mt-4">
                  <Label>Initial Node Values
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="ml-2 text-blue-400 hover:text-blue-600" onClick={() => setShowClampHelp(h => !h)}>
                          <FaInfoCircle />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>What is clamping?</TooltipContent>
                    </Tooltip>
                  </Label>
                  {showClampHelp && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-sm">
                      <b>Clamping</b> means holding a variable at your chosen value for the entire simulation. Use this to model interventions where a variable is externally controlled (e.g., a policy or sustained external input).
                    </div>
                  )}
                  <div className="mt-2 grid gap-6">
                    {model.nodes.map((node) => {
                      const isClamped = clampedNodes.includes(node.id);
                      return (
                        <div key={node.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Label>{node.label}</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" onClick={() => toggleClamp(node.id)} className={isClamped ? 'text-blue-500' : 'text-gray-400 hover:text-blue-400'}>
                                    {isClamped ? <FaLock /> : <FaLockOpen />}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isClamped ? 'This variable is clamped and will be held constant during the scenario simulation.' : 'Click to clamp this variable (hold it constant during the scenario simulation).'}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className={isClamped ? 'text-blue-500' : 'text-muted-foreground'}>
                              {initialValues[node.id]?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                          <Slider
                            min={0}
                            max={1}
                            step={0.01}
                            value={[initialValues[node.id] || 0]}
                            onValueChange={(values) => handleInitialValueChange(node.id, values[0])}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setNewScenarioDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={createScenario} 
                disabled={createScenarioLoading}
              >
                {createScenarioLoading ? "Creating..." : "Create Scenario"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </TooltipProvider>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Delete Scenario</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this scenario? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteScenario}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}