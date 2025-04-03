import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useFCM } from '@/hooks/useFCM';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MainWorkspace from '@/components/layout/MainWorkspace';
import { FCMModel } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function ModelEditor() {
  const { modelId } = useParams<{ modelId: string }>();
  const { model, isLoading, error, updateModel } = useFCM(modelId);
  const [showError, setShowError] = useState(false);
  
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
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        {isLoading ? (
          <div className="flex-1 p-6">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-[calc(100vh-8rem)] w-full rounded-md" />
          </div>
        ) : model ? (
          <MainWorkspace model={model} onModelUpdate={handleModelUpdate} />
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
