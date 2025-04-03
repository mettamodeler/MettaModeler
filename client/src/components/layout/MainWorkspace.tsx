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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Workspace Tabs */}
      <div className="h-10 glass border-b border-white/10 flex items-center px-4 space-x-6">
        <div 
          className={`h-full flex items-center cursor-pointer ${activeTab === 'editor' ? 'border-b-2 border-secondary text-secondary' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('editor')}
        >
          <span className="text-sm font-medium">{model.name.toLowerCase()}</span>
        </div>
        <div 
          className={`h-full flex items-center cursor-pointer ${activeTab === 'simulation' ? 'border-b-2 border-secondary text-secondary' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('simulation')}
        >
          <span className="text-sm">simulation</span>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'editor' ? (
          <FCMEditor model={model} onModelUpdate={onModelUpdate} />
        ) : (
          <SimulationPanel model={model} />
        )}
      </div>
    </div>
  );
}
