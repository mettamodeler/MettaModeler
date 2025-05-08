import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Project, FCMModel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
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

interface SidebarProps {
  currentProjectId: string | null;
}

export default function Sidebar({ currentProjectId }: SidebarProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Dialog states
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingModel, setIsCreatingModel] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelProjectId, setNewModelProjectId] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'project' | 'model', id: number} | null>(null);
  
  // Extract current model ID from URL if on model page
  const modelIdMatch = location.match(/\/models\/([^/]+)/);
  const currentModelId = modelIdMatch ? parseInt(modelIdMatch[1], 10) : null;
  
  // Fetch projects and models
  const { data: projects = [], refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });
  
  const { data: models = [], refetch: refetchModels } = useQuery<FCMModel[]>({
    queryKey: ['/api/models'],
  });
  
  // Find the current model to determine project
  const currentModel = models.find(model => {
    if (currentModelId === null) return false;
    return Number(model.id) === currentModelId;
  });
  
  // Get the current project ID from the URL if available
  const urlProjectId = location.startsWith('/project/') ? location.split('/')[2] : null;
  
  // Determine the effective project ID (URL takes precedence over prop)
  const effectiveProjectId = urlProjectId || currentProjectId;
  console.log('Sidebar: Effective Project ID:', effectiveProjectId);
  console.log('Sidebar: Current Model:', currentModel);

  // Filter models based on selected project
  const filteredModels = effectiveProjectId
    ? models.filter(m => {
        // Ensure both IDs are strings for comparison
        const modelProjectId = m.projectId?.toString();
        const targetProjectId = effectiveProjectId.toString();
        return modelProjectId === targetProjectId;
      })
    : models;

  console.log('Sidebar: Filtered Models:', filteredModels);

  // Handle project selection
  const handleProjectClick = (projectId: string) => {
    if (effectiveProjectId === projectId) {
      // If clicking the same project, clear the filter
      setLocation('/');
    } else {
      // Navigate to the project's URL
      setLocation(`/project/${projectId}`);
    }
  };

  // Force a re-render when location changes or when currentProjectId changes
  useEffect(() => {
    console.log('Sidebar: Location changed to:', location);
    console.log('Sidebar: Current Project ID:', currentProjectId);
    // Refetch data when location changes or project selection changes
    refetchModels();
    refetchProjects();
  }, [location, currentProjectId, refetchModels, refetchProjects]);

  // Force a re-render when projects or models change
  useEffect(() => {
    console.log('Sidebar: Data updated');
    console.log('Projects:', projects);
    console.log('Models:', models);
  }, [projects, models]);

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
        const response = await apiRequest('DELETE', `/api/projects/${itemToDelete.id}`);
        
        // For 204 No Content responses, this is a success
        if (response === null || response === undefined) {
          toast({
            title: "Project Deleted",
            description: "Project has been deleted successfully",
          });
          
          // Remove the deleted project from local state
          const updatedProjects = projects.filter(p => Number(p.id) !== Number(itemToDelete.id));
          queryClient.setQueryData(['/api/projects'], updatedProjects);
          
          // Remove any models associated with this project from local state
          const updatedModels = models.filter(m => Number(m.projectId) !== Number(itemToDelete.id));
          queryClient.setQueryData(['/api/models'], updatedModels);
          
          // Invalidate all other related queries
          queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
          queryClient.invalidateQueries({ queryKey: ['/api/models'] });
          
          // If we're viewing this project, go back to home
          if (currentProjectId !== null && Number(currentProjectId) === itemToDelete.id) {
            setLocation('/');
          }
        }
      } else {
        const response = await apiRequest('DELETE', `/api/models/${itemToDelete.id}`);
        
        // For 204 No Content responses, this is a success
        if (response === null || response === undefined) {
          toast({
            title: "Model Deleted",
            description: "Model has been deleted successfully",
          });
          
          // Remove the deleted model from local state
          const updatedModels = models.filter(m => Number(m.id) !== Number(itemToDelete.id));
          queryClient.setQueryData(['/api/models'], updatedModels);
          
          // Invalidate all relevant queries
          queryClient.invalidateQueries({ queryKey: ['/api/models'] });
          queryClient.invalidateQueries({ queryKey: [`/api/models/${itemToDelete.id}`] });
          
          // Invalidate any scenarios associated with this model
          queryClient.invalidateQueries({ queryKey: [`/api/models/${itemToDelete.id}/scenarios`] });
          
          // If we're viewing this model, go back to home
          if (currentModelId !== null && currentModelId === itemToDelete.id) {
            setLocation('/');
          }
        }
      }
    } catch (error) {
      console.error("Error during deletion:", error);
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
            onClick={() => {
              console.log('Create Project clicked');
              setIsCreatingProject(true);
            }}
            title="Create New Project"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        
        {/* Projects List */}
        <div className="space-y-1">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleProjectClick(project.id.toString())}
              className={cn(
                "w-full flex items-center py-2 px-3 text-sm font-medium rounded-md hover:bg-secondary",
                effectiveProjectId === project.id.toString() ? "bg-secondary" : "transparent"
              )}
            >
              {project.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Divider */}
      <div className="border-t border-white/10 my-2"></div>
      
      {/* Models Section */}
      <div className="p-4 flex-1 overflow-auto">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-300">models</h2>
            {effectiveProjectId && (
              <button
                onClick={() => setLocation('/')}
                className="text-xs text-secondary hover:text-white"
                title="Clear project filter"
              >
                clear
              </button>
            )}
          </div>
          <button 
            className="text-secondary hover:text-white p-1 rounded-md hover:bg-white/10"
            onClick={() => {
              if (effectiveProjectId) {
                setNewModelProjectId(effectiveProjectId);
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
        
        {/* Models List */}
        <div className="space-y-1">
          {filteredModels.map((model) => (
            <Link
              key={model.id}
              href={`/models/${model.id}`}
              className={cn(
                "block py-2 px-3 text-sm font-medium rounded-md hover:bg-secondary",
                currentModelId === model.id ? "bg-secondary" : "transparent"
              )}
            >
              {model.name}
            </Link>
          ))}
        </div>
      </div>
      
      {/* User Section */}
      <div className="p-3 glass border-t border-white/10">
        {user ? (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm">
              {user.displayName ? 
                user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) :
                user.username.substring(0, 2).toUpperCase()
              }
            </div>
            <div>
              <div className="text-sm font-medium">{user.displayName || user.username}</div>
              <div className="text-xs text-gray-400">FCM Researcher</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => setLocation("/auth")}
            >
              Sign In
            </button>
          </div>
        )}
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
