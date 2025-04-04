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
import { FCMModel } from '@/lib/types';

export default function ModelEditor() {
  const { modelId } = useParams<{ modelId: string }>();
  const numericModelId = parseInt(modelId, 10);
  const { model, isLoading, error, updateModel } = useFCM(numericModelId.toString());
  const [showError, setShowError] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  
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
  
  return (
    <div className="flex flex-col h-screen">
      <AppHeader model={model} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        {isLoading ? (
          <div className="flex-1 p-6">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-[calc(100vh-8rem)] w-full rounded-md" />
          </div>
        ) : model ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 pt-4 border-b border-border/40">
                <TabsList className="bg-background/30 backdrop-blur-sm">
                  <TabsTrigger value="editor">Model Editor</TabsTrigger>
                  <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="editor" className="flex-1 flex overflow-hidden m-0 data-[state=inactive]:hidden">
                <MainWorkspace model={model} onModelUpdate={handleModelUpdate} />
              </TabsContent>
              
              <TabsContent value="scenarios" className="flex-1 overflow-auto m-0 data-[state=inactive]:hidden p-4">
                <ScenarioManager model={model} />
              </TabsContent>
            </Tabs>
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
