import { useState } from "react";
import { ChartContainer, ChartLegend, ChartLegendItem } from "@/components/ui/chart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Info } from "lucide-react";
import { Scenario, SimulationResult } from "@/lib/types";
import { FCMModel } from "@shared/schema";

interface ScenarioComparisonProps {
  scenarios: Scenario[];
  model: FCMModel;
}

export default function ScenarioComparison({ scenarios, model }: ScenarioComparisonProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  if (scenarios.length === 0) {
    return (
      <Alert className="mt-4">
        <Info className="h-4 w-4" />
        <AlertTitle>No Scenarios</AlertTitle>
        <AlertDescription>Create some scenarios to compare their results</AlertDescription>
      </Alert>
    );
  }

  // Convert time series data into a format suitable for recharts
  const chartData = scenarios.reduce((acc, scenario) => {
    if (!scenario.results?.timeSeriesData) return acc;
    
    const timeseriesData = scenario.results.timeSeriesData;
    const iterations = Object.values(timeseriesData)[0]?.length || 0;
    
    for (let i = 0; i < iterations; i++) {
      if (!acc[i]) {
        acc[i] = { iteration: i };
      }
      
      for (const nodeId in timeseriesData) {
        if (nodeId === selectedNodeId || !selectedNodeId) {
          const key = `${scenario.name}-${nodeId}`;
          acc[i][key] = timeseriesData[nodeId][i];
        }
      }
    }
    
    return acc;
  }, [] as Record<string, any>[]);

  // Generate unique node name/id combinations for the dropdown
  const nodeOptions = model.nodes.map(node => ({
    id: node.id,
    label: node.label
  }));
  
  // Generate unique colors for each scenario
  const colors = [
    "#0ea5e9", // sky
    "#f97316", // orange
    "#10b981", // emerald
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#ef4444", // red
    "#22d3ee", // cyan
    "#84cc16", // lime
  ];
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Scenario Comparison</h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass p-4 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold">Select Node to Compare</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {nodeOptions.map((node, index) => (
              <button
                key={node.id}
                className={`p-2 text-sm rounded border transition-colors ${
                  selectedNodeId === node.id
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border hover:border-primary/40"
                }`}
                onClick={() => setSelectedNodeId(node.id)}
              >
                {node.label}
              </button>
            ))}
          </div>
          
          <button 
            className="text-xs text-muted-foreground underline hover:text-primary transition-colors"
            onClick={() => setSelectedNodeId(null)}
          >
            Show all nodes
          </button>
        </div>
        
        <div className="glass p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Scenarios</h3>
          <ul className="space-y-2">
            {scenarios.map((scenario, index) => {
              const color = colors[index % colors.length];
              return (
                <li key={scenario.id} className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 inline-block rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <span>{scenario.name}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      
      <div className="glass p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Convergence Visualization</h3>
        <div className="h-[400px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="iteration" 
                  stroke="rgba(255,255,255,0.5)"
                  label={{ value: 'Iterations', position: 'insideBottomRight', offset: -5, fill: 'rgba(255,255,255,0.5)' }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.5)"
                  label={{ value: 'Node Value', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.8)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: 'white'
                  }}
                />
                {scenarios.map((scenario, scenarioIndex) => {
                  if (!scenario.results?.timeSeriesData) return null;
                  
                  const scenarioColor = colors[scenarioIndex % colors.length];
                  
                  return Object.keys(scenario.results.timeSeriesData).map((nodeId, nodeIndex) => {
                    if (selectedNodeId && nodeId !== selectedNodeId) return null;
                    
                    // Find the node label for better display
                    const nodeLabel = model.nodes.find(n => n.id === nodeId)?.label || nodeId;
                    const dataKey = `${scenario.name}-${nodeId}`;
                    
                    return (
                      <Line
                        key={`${scenario.id}-${nodeId}`}
                        type="monotone"
                        dataKey={dataKey}
                        name={`${scenario.name}: ${nodeLabel}`}
                        stroke={scenarioColor}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                    );
                  });
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No data available for the selected scenarios</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}