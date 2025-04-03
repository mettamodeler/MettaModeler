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
import { FCMModel } from "@shared/schema";
import { Scenario, SimulationParams } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import ScenarioComparison from "./ScenarioComparison";

interface ScenarioManagerProps {
  model: FCMModel;
}

export default function ScenarioManager({ model }: ScenarioManagerProps) {
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [newScenarioDialogOpen, setNewScenarioDialogOpen] = useState(false);
  const [createScenarioLoading, setCreateScenarioLoading] = useState(false);
  const [deleteScenarioId, setDeleteScenarioId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [newScenarioName, setNewScenarioName] = useState("");
  const [initialValues, setInitialValues] = useState<Record<string, number>>({});
  const { runSimulation } = useSimulation(model);

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

    setCreateScenarioLoading(true);
    
    try {
      // Run simulation with current initial values
      const simParams: SimulationParams = {
        initialValues
      };
      
      const results = runSimulation(simParams);
      
      // Create scenario in database
      const response = await apiRequest("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newScenarioName,
          modelId: model.id,
          initialValues,
          results
        })
      });
      
      // Add new scenario to the list
      setScenarios(prev => [...prev, response]);
      
      // Reset form and close dialog
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
        description: "Failed to create scenario. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCreateScenarioLoading(false);
    }
  };

  // Delete scenario
  const deleteScenario = async () => {
    if (!deleteScenarioId) return;
    
    try {
      await apiRequest(`/api/scenarios/${deleteScenarioId}`, {
        method: "DELETE"
      });
      
      // Remove from scenarios list
      setScenarios(prev => prev.filter(s => s.id !== deleteScenarioId));
      
      // Remove from selected scenarios if present
      if (selectedScenarios.has(deleteScenarioId)) {
        const newSelected = new Set(selectedScenarios);
        newSelected.delete(deleteScenarioId);
        setSelectedScenarios(newSelected);
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
    }
  };

  // Toggle scenario selection
  const toggleScenarioSelection = (scenario: Scenario) => {
    const newSelected = new Set(selectedScenarios);
    
    if (newSelected.has(scenario.id)) {
      newSelected.delete(scenario.id);
    } else {
      newSelected.add(scenario.id);
    }
    
    setSelectedScenarios(newSelected);
  };

  // Handle initial value change
  const handleInitialValueChange = (nodeId: string, value: number) => {
    setInitialValues(prev => ({
      ...prev,
      [nodeId]: value
    }));
  };

  // Filter scenarios based on selection
  const selectedScenariosList = scenarios.filter(s => selectedScenarios.has(s.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Scenarios</h2>
        <Button onClick={() => setNewScenarioDialogOpen(true)}>
          New Scenario
        </Button>
      </div>
      
      {loading ? (
        <div className="glass p-6 rounded-lg text-center">
          <p className="text-muted-foreground">Loading scenarios...</p>
        </div>
      ) : scenarios.length === 0 ? (
        <div className="glass p-6 rounded-lg text-center">
          <p className="text-muted-foreground">No scenarios found for this model.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create a scenario to run simulations with different initial values.
          </p>
        </div>
      ) : (
        <>
          <div className="glass rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="p-4 text-left font-medium">Name</th>
                  <th className="p-4 text-left font-medium">Created</th>
                  <th className="p-4 text-left font-medium">Status</th>
                  <th className="p-4 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario) => (
                  <tr 
                    key={scenario.id}
                    className={`border-b border-border/30 transition-colors hover:bg-muted/30 ${
                      selectedScenarios.has(scenario.id) ? "bg-primary/10" : ""
                    }`}
                  >
                    <td className="p-4">
                      <div className="font-medium">{scenario.name}</div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {format(new Date(scenario.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="p-4">
                      {scenario.results ? (
                        <Badge variant="secondary">
                          {scenario.results.converged ? "Converged" : "Not Converged"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Results</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleScenarioSelection(scenario)}
                        >
                          {selectedScenarios.has(scenario.id) ? "Deselect" : "Select"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive border-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setDeleteScenarioId(scenario.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {selectedScenariosList.length > 0 && (
            <ScenarioComparison 
              scenarios={selectedScenariosList}
              model={model}
            />
          )}
        </>
      )}
      
      {/* New Scenario Dialog */}
      <Dialog open={newScenarioDialogOpen} onOpenChange={setNewScenarioDialogOpen}>
        <DialogContent className="glass border border-white/10 max-w-2xl">
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
                <Label>Initial Node Values</Label>
                <div className="mt-2 grid gap-6">
                  {model.nodes.map((node) => (
                    <div key={node.id} className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{node.label}</Label>
                        <span className="text-muted-foreground">
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
                  ))}
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
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass border border-white/10">
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
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteScenario}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}