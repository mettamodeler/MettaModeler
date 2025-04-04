import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FCMModel } from "@shared/schema";
import { UserProfile } from "@/components/auth/user-profile";

interface AppHeaderProps {
  model?: FCMModel;
}

export default function AppHeader({ model }: AppHeaderProps) {
  const [location, setLocation] = useLocation();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toast } = useToast();

  // For backward compatibility with existing code
  const handleExport = () => {
    exportJSON();
  };

  const exportJSON = () => {
    if (!model) {
      toast({
        variant: "destructive",
        title: "No Model Selected",
        description: "Please open a model before exporting",
      });
      return;
    }

    // Create JSON file
    const modelData = JSON.stringify(model, null, 2);
    const blob = new Blob([modelData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement("a");
    a.href = url;
    a.download = `${model.name.toLowerCase().replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Model Exported",
      description: "Your model has been exported as a JSON file",
    });
  };

  const exportExcel = async () => {
    if (!model) {
      toast({
        variant: "destructive",
        title: "No Model Selected",
        description: "Please open a model before exporting",
      });
      return;
    }

    try {
      // Call the server API to get Excel file
      const response = await fetch(`/api/export/model/${model.id}?format=excel`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to export: ${response.statusText}`);
      }
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${model.name.toLowerCase().replace(/\s+/g, "_")}.xlsx`;
      
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }
      
      // Convert response to blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Model Exported",
        description: "Your model has been exported as an Excel file",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const exportJupyter = async () => {
    if (!model) {
      toast({
        variant: "destructive",
        title: "No Model Selected",
        description: "Please open a model before exporting",
      });
      return;
    }

    try {
      // Show loading toast
      toast({
        title: "Generating Notebook",
        description: "Please wait while we create your Jupyter notebook...",
      });
      
      // Call the server API to get Jupyter notebook
      const response = await fetch('/api/export/notebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: model,
          type: 'model',
          modelId: model.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to export: ${response.statusText}`);
      }
      
      // Get notebook data
      const data = await response.json();
      const notebookContent = JSON.stringify(data, null, 2);
      
      // Create download
      const blob = new Blob([notebookContent], { type: 'application/x-ipynb+json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${model.name.toLowerCase().replace(/\s+/g, "_")}.ipynb`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Notebook Exported",
        description: "Your model has been exported as a Jupyter notebook",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  return (
    <header className="h-14 glass flex items-center justify-between px-4 z-10">
      <div className="flex items-center">
        <Link href="/" className="text-2xl font-light tracking-wider mr-6">
          <span className="text-secondary font-semibold">metta</span>
          <span className="text-primary">modeler</span>
        </Link>
        <nav className="hidden md:flex space-x-4">
          <Link href="/">
            <button className="px-3 py-1 text-sm rounded-md hover:bg-white/10 transition">models</button>
          </Link>
          <button 
            className="px-3 py-1 text-sm rounded-md hover:bg-white/10 transition"
            onClick={() => setHelpDialogOpen(true)}
          >
            help
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-1 text-sm rounded-md hover:bg-white/10 transition">
                export
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="dark-glass border border-white/10">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportJSON}>
                JSON Format
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel}>
                Excel Format
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportJupyter}>
                Jupyter Notebook
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
      <div className="flex items-center space-x-3">
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetTrigger asChild>
            <button className="p-2 rounded-full hover:bg-white/10" title="Settings">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </SheetTrigger>
          <SheetContent className="dark-glass border-l border-white/10">
            <SheetHeader>
              <SheetTitle>application settings</SheetTitle>
              <SheetDescription>
                Configure the application settings
              </SheetDescription>
            </SheetHeader>
            
            <div className="py-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Simulation Parameters</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Default Max Iterations</span>
                    <span className="text-sm">20</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Default Threshold</span>
                    <span className="text-sm">0.001</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">User Interface</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Theme</span>
                    <span className="text-sm">Dark</span>
                  </div>
                </div>
              </div>
              
              <Button className="w-full" variant="secondary">
                Save Settings
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        
        <UserProfile />
      </div>
      
      {/* Help Dialog */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="dark-glass border border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle>MettaModeler Help</DialogTitle>
            <DialogDescription>
              Quick guide to using the FCM modeling platform
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">What is a Fuzzy Cognitive Map?</h3>
              <p className="text-sm text-gray-400">
                Fuzzy Cognitive Maps (FCMs) are graphical models used to represent complex causal relationships 
                between different concepts. They're useful for modeling and simulating complex systems where
                relationships between variables can be uncertain or "fuzzy."
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Using the Model Editor</h3>
              <ul className="text-sm text-gray-400 list-disc list-inside space-y-2">
                <li>Add nodes by clicking the + button in the top-right of the canvas</li>
                <li>Connect nodes by dragging from one node's handle to another</li>
                <li>Edit node labels by clicking on them</li>
                <li>Change node types using the dropdown on each node</li>
                <li>Adjust edge weights by clicking on the weight label</li>
                <li>Delete nodes or edges by selecting them and pressing Delete</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Running Simulations</h3>
              <ul className="text-sm text-gray-400 list-disc list-inside space-y-2">
                <li>Switch to the simulation tab to set initial values for nodes</li>
                <li>Configure driver nodes to represent your input variables</li>
                <li>Set simulation parameters like iterations and threshold</li>
                <li>Run the simulation to see how values propagate through the network</li>
                <li>Save scenarios to compare different simulations</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setHelpDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
