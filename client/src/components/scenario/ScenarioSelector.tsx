import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExtendedScenario } from "@/lib/types";

interface ScenarioSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  scenarios: ExtendedScenario[];
  label: string;
  placeholder?: string;
  isBaselineSelector?: boolean;
}

export default function ScenarioSelector({
  value,
  onValueChange,
  scenarios,
  label,
  placeholder = "Select scenario",
  isBaselineSelector = false
}: ScenarioSelectorProps) {
  // Filter scenarios based on whether they are baseline or not
  const filteredScenarios = scenarios.filter(scenario => 
    isBaselineSelector ? scenario.isBaseline : !scenario.isBaseline
  );

  // If no scenarios are available, show a message
  if (filteredScenarios.length === 0) {
    return (
      <div>
        <div className="text-sm mb-2">{label}</div>
        <div className="text-sm text-gray-400">
          {isBaselineSelector 
            ? "No baseline scenarios available" 
            : "No comparison scenarios available"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm mb-2">{label}</div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {filteredScenarios.map((scenario) => (
            <SelectItem key={scenario.id} value={scenario.id}>
              {scenario.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}