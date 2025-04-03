import React from 'react';
import { Scenario } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScenarioSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  scenarios: Scenario[];
  baselineId: string;
  label: string;
  placeholder?: string;
}

export default function ScenarioSelector({
  value,
  onValueChange,
  scenarios,
  baselineId,
  label,
  placeholder = "Select scenario"
}: ScenarioSelectorProps) {
  return (
    <div>
      <div className="text-sm mb-2">{label}</div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem key={baselineId} value={baselineId}>
            Baseline (No Intervention)
          </SelectItem>
          {scenarios.map((scenario) => (
            <SelectItem key={scenario.id} value={String(scenario.id)}>
              {scenario.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}