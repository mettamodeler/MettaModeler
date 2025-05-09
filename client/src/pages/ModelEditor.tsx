import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useFCM } from '@/hooks/useFCM';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MainWorkspace from '@/components/layout/MainWorkspace';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import ScenarioManager from '@/components/scenario/ScenarioManager';
import SimulationPanel from '@/components/simulation/SimulationPanel';
import { FCMModel } from '@/lib/types';

export default function ModelEditor() {
  const { modelId } = useParams<{ modelId: string }>();
  const numericModelId = parseInt(modelId, 10);
  const { model, isLoading, error, updateModel } = useFCM(numericModelId.toString());
  const [showError, setShowError] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<Set<string>>(new Set());
  const [scenarioTab, setScenarioTab] = useState('chart');
  
  // Show error dialog if there's an error
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);
  
  // Handle model updates
  const handleModelUpdate = (updatedModel: FCMModel) => {
    updateModel(updatedModel);
  };
  
  const tabs = [
    { label: "Model Editor", value: "editor" },
    { label: "Scenarios", value: "scenarios" },
    { label: "Analysis", value: "analysis" },
  ];
  
  return (
    <div className="flex flex-col h-screen min-h-0">
      <AppHeader model={model} />
      
      <div className="flex flex-1 h-full min-h-0 overflow-hidden">
        <Sidebar currentProjectId={model?.projectId ? String(model.projectId) : null} />
        
        {isLoading ? (
          <div className="flex-1 p-6">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-[calc(100vh-8rem)] w-full rounded-md" />
          </div>
        ) : model ? (
          <div className="flex-1 h-full min-h-0 w-full">
            {/* Single flat tab bar */}
            <div className="flex bg-transparent px-4 pt-4 tab-bar">
              {tabs.map(tab => (
                <button
                  key={tab.value}
                  className={`tab px-6 py-2 text-lg font-medium transition
                    ${activeTab === tab.value ? 'active' : ''}
                  `}
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1 flex overflow-hidden min-h-0 border-t-2 border-[hsl(var(--secondary))]">
              {activeTab === "editor" && (
                <MainWorkspace key={modelId} model={model} onModelUpdate={handleModelUpdate} />
              )}
              {activeTab === "scenarios" && (
                <div className="flex-1 flex justify-center items-start p-8">
                  <div className="w-full max-w-5xl mx-auto p-4 max-h-[80vh] overflow-auto">
                    {/* H1: Main view title */}
                    <h1 className="text-2xl font-bold mb-4">Scenario Comparison</h1>
                    {/* H2: Section header */}
                    <h2 className="text-xl font-semibold mb-3">Compare results between baseline and scenario</h2>
                    {/* ScenarioManager content will use H3 for subsections, and all cards/tables will use the unified card style */}
                    <ScenarioManager 
                      model={model} 
                      selectedScenarioIds={selectedScenarioIds}
                      setSelectedScenarioIds={setSelectedScenarioIds}
                      scenarioTab={scenarioTab}
                      setScenarioTab={setScenarioTab}
                    />
                  </div>
                </div>
              )}
              {activeTab === "analysis" && (
                <div className="flex-1 flex justify-center items-start p-8">
                  <div className="w-full max-w-5xl mx-auto p-4 max-h-[80vh] overflow-auto">
                    <h1 className="text-2xl font-bold mb-4">Analysis</h1>
                    <SimulationPanel model={model} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="glass p-6 rounded-lg max-w-md">
              <h2 className="text-xl font-medium mb-2">Model Not Found</h2>
              <p className="text-gray-400 mb-4">
                The model you are looking for could not be found or you don't have access to it.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Error Dialog */}
      <Dialog open={showError} onOpenChange={setShowError}>
        <DialogContent className="dark-glass border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-red-500">Error Loading Model</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-200">
              {error instanceof Error ? error.message : "An unknown error occurred while loading the model."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
