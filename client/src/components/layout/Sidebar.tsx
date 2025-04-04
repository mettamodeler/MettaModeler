import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Project, FCMModel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Dialog states
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingModel, setIsCreatingModel] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelProjectId, setNewModelProjectId] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'project' | 'model', id: number} | null>(null);
  
  // Fetch projects
  const { data: projects = [], refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  
  // Extract current model ID from URL if on model page
  const modelIdMatch = location.match(/\/models\/([^/]+)/);
  const currentModelId = modelIdMatch ? parseInt(modelIdMatch[1], 10) : null;
  
  // Find the current model to determine project
  const { data: models = [], refetch: refetchModels } = useQuery<FCMModel[]>({
    queryKey: ["/api/models"],
  });
  
  const currentModel = models.find(model => {
    if (currentModelId === null) return false;
    return Number(model.id) === currentModelId;
  });
  const currentProjectId = currentModel?.projectId;

  // Create a new project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        variant: "destructive",
        title: "Project Name Required",
        description: "Please enter a name for your project",
      });
      return;
    }
    
    try {
      await apiRequest('POST', '/api/projects', {
        name: newProjectName,
        description: '',
      });
      
      toast({
        title: "Project Created",
        description: `Project "${newProjectName}" has been created`,
      });
      
      setNewProjectName('');
      setIsCreatingProject(false);
      refetchProjects();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to Create Project",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
  
  // Create a new model
  const handleCreateModel = async () => {
    if (!newModelName.trim()) {
      toast({
        variant: "destructive",
        title: "Model Name Required",
        description: "Please enter a name for your model",
      });
      return;
    }
    
    const projectId = newModelProjectId || (currentProjectId ? currentProjectId.toString() : '');
    
    if (!projectId) {
      toast({
        variant: "destructive",
        title: "Project Required",
        description: "Please select a project for your model",
      });
      return;
    }
    
    try {
      const newModel = {
        name: newModelName,
        description: '',
        projectId: parseInt(projectId, 10),
        nodes: [],
        edges: [],
      };
      
      await apiRequest('POST', '/api/models', newModel);
      
      toast({
        title: "Model Created",
        description: `Model "${newModelName}" has been created`,
      });
      
      setNewModelName('');
      setIsCreatingModel(false);
      refetchModels();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to Create Model",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Handle delete
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      if (itemToDelete.type === 'project') {
        await apiRequest('DELETE', `/api/projects/${itemToDelete.id}`);
        toast({
          title: "Project Deleted",
          description: "Project has been deleted successfully",
        });
        refetchProjects();
        // If we're viewing this project, go back to home
        if (currentProjectId !== null && Number(currentProjectId) === itemToDelete.id) {
          setLocation('/');
        }
      } else {
        await apiRequest('DELETE', `/api/models/${itemToDelete.id}`);
        toast({
          title: "Model Deleted",
          description: "Model has been deleted successfully",
        });
        refetchModels();
        // If we're viewing this model, go back to home
        if (currentModelId !== null && currentModelId === itemToDelete.id) {
          setLocation('/');
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: `Failed to Delete ${itemToDelete.type}`,
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };
  
  return (
    <div className="dark-glass w-64 flex-shrink-0 flex flex-col border-r border-white/10 z-10">
      {/* Projects Section */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-300">projects</h2>
          <button 
            className="text-secondary hover:text-white p-1 rounded-md hover:bg-white/10"
            onClick={() => setIsCreatingProject(true)}
            title="Create New Project"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        
        {/* Project List */}
        <div className="space-y-2">
          {projects.map((project) => (
            <div 
              key={project.id}
              className={cn(
                "glass rounded-md p-2 cursor-pointer group transition-all",
                Number(project.id) === Number(currentProjectId) 
                  ? "bg-white/10 shadow-glow-sm border border-secondary/20" 
                  : "hover:shadow-glow-sm"
              )}
              onClick={() => setLocation(`/?project=${project.id}`)}
            >
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">{project.name.toLowerCase()}</div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="text-xs p-1 hover:bg-white/10 rounded"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1"></circle>
                          <circle cx="19" cy="12" r="1"></circle>
                          <circle cx="5" cy="12" r="1"></circle>
                        </svg>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="dark-glass border border-white/10">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewModelProjectId(project.id.toString());
                          setIsCreatingModel(true);
                        }}
                      >
                        Add Model
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500 focus:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete({type: 'project', id: Number(project.id)});
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Divider */}
      <div className="border-t border-white/10 my-2"></div>
      
      {/* Models Section */}
      <div className="p-4 flex-1 overflow-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-300">models</h2>
          <button 
            className="text-secondary hover:text-white p-1 rounded-md hover:bg-white/10"
            onClick={() => {
              if (currentProjectId) {
                setNewModelProjectId(currentProjectId.toString());
              }
              setIsCreatingModel(true);
            }}
            title="Create New Model"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        
        {/* Model List */}
        <div className="space-y-2">
          {models
            .filter(model => !currentProjectId || Number(model.projectId) === Number(currentProjectId))
            .map((model) => (
              <div 
                key={model.id}
                className={cn(
                  "glass rounded-md p-2 cursor-pointer group transition-all",
                  Number(model.id) === currentModelId 
                    ? "bg-white/10 shadow-glow-sm border border-secondary/20" 
                    : "hover:shadow-glow-sm"
                )}
                onClick={() => setLocation(`/models/${model.id}`)}
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">{model.name.toLowerCase()}</div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          className="text-xs p-1 hover:bg-white/10 rounded" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="19" cy="12" r="1"></circle>
                            <circle cx="5" cy="12" r="1"></circle>
                          </svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dark-glass border border-white/10">
                        <DropdownMenuItem 
                          className="text-red-500 focus:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete({type: 'model', id: Number(model.id)});
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          Delete Model
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {model.nodes.length} nodes · {model.edges.length} connections
                </div>
              </div>
            ))}
        </div>
      </div>
      
      {/* User Section */}
      <div className="p-3 glass border-t border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm">
            EW
          </div>
          <div>
            <div className="text-sm font-medium">Emma Wilson</div>
            <div className="text-xs text-gray-400">Researcher</div>
          </div>
        </div>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={isCreatingProject} onOpenChange={setIsCreatingProject}>
        <DialogContent className="dark-glass border border-white/10">
          <DialogHeader>
            <DialogTitle>create new project</DialogTitle>
            <DialogDescription>
              Projects help you organize your models by topic or research area.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Climate Adaptation"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingProject(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject}>Create Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Model Dialog */}
      <Dialog open={isCreatingModel} onOpenChange={setIsCreatingModel}>
        <DialogContent className="dark-glass border border-white/10">
          <DialogHeader>
            <DialogTitle>create new model</DialogTitle>
            <DialogDescription>
              Create a new Fuzzy Cognitive Map model for your research.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                placeholder="e.g., Water Management"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project-select">Project</Label>
              <select
                id="project-select"
                value={newModelProjectId}
                onChange={(e) => setNewModelProjectId(e.target.value)}
                className="w-full p-2 rounded bg-white/10 border border-white/10 focus:border-secondary focus:outline-none"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingModel(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateModel}>Create Model</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="dark-glass border border-white/10">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              {itemToDelete?.type === 'project' 
                ? "Are you sure you want to delete this project? All models in this project will also be deleted. This action cannot be undone."
                : "Are you sure you want to delete this model? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
