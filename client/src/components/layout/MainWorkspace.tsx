import { ReactNode, useState } from "react";
import { FCMModel } from "@/lib/types";
import FCMEditor from "@/components/fcm/FCMEditor";
import SimulationPanel from "@/components/simulation/SimulationPanel";

interface MainWorkspaceProps {
  model: FCMModel;
  onModelUpdate: (model: FCMModel) => void;
}

export default function MainWorkspace({ model, onModelUpdate }: MainWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'editor'|'simulation'>('editor');

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Workspace Header: Only show model name, no sub-menu */}
      <div className="h-10 glass border-b border-white/10 flex items-center px-4">
        <span className="text-sm font-medium text-secondary">
          {model.name.toLowerCase()}
        </span>
      </div>
      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden min-h-0 h-full">
        <FCMEditor model={model} onModelUpdate={onModelUpdate} />
      </div>
    </div>
  );
}
