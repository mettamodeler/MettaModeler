import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'wouter';
import { Project, FCMModel } from '@/lib/types';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const params = useParams();
  
  // Dialog states
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingModel, setIsCreatingModel] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelProjectId, setNewModelProjectId] = useState('');
  
  // Get current project ID from URL params
  const currentProjectId = params.projectId || null;
  
  console.log('Home: Current Project ID:', currentProjectId);
  console.log('Home: Current Location:', location);
  
  // Get projects and models
  const { data: projects = [], refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });
  
  const { data: models = [], refetch: refetchModels } = useQuery<FCMModel[]>({
    queryKey: ['/api/models'],
  });

  console.log('Home: All Models:', models);

  // Filter models based on selected project
  const filteredModels = currentProjectId 
    ? models.filter(m => {
        console.log('Home filtering model:', m.id, m.projectId, 'against currentProjectId:', currentProjectId);
        return m.projectId?.toString() === currentProjectId;
      })
    : models;

  console.log('Home: Filtered Models:', filteredModels);

  // Handle View All click for a project
  const handleViewAll = (projectId: string) => {
    console.log('View All clicked for project:', projectId);
    navigate(`/project/${projectId}`);
  };

  // Force a re-render when location changes
  useEffect(() => {
    console.log('Home: Location changed to:', location);
  }, [location]);

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
    
    if (!newModelProjectId) {
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
        projectId: parseInt(newModelProjectId, 10), // Convert string to number
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
  
  return (
    <div className="flex flex-col h-screen">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentProjectId={currentProjectId} />
        
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {currentProjectId 
                      ? projects.find(p => p.id.toString() === currentProjectId)?.name || 'Project'
                      : 'All Projects'}
                  </h1>
                  <p className="text-muted-foreground">
                    {currentProjectId 
                      ? `Viewing models in project`
                      : 'Recent models and projects'}
                  </p>
                </div>
              </div>

              {currentProjectId ? (
                // Show only models for selected project
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredModels.map((model) => (
                    <Card 
                      key={model.id}
                      className="dark-glass cursor-pointer hover:shadow-glow-sm transition-all"
                      onClick={() => navigate(`/models/${model.id}`)}
                    >
                      <CardHeader>
                        <CardTitle>{model.name}</CardTitle>
                        <CardDescription>
                          {model.nodes.length} nodes · {model.edges.length} connections
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                // Show projects and recent models
                <Tabs defaultValue="projects" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                    <TabsTrigger value="recent">Recent Models</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="projects" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projects.map((project) => (
                        <Card 
                          key={project.id}
                          className="dark-glass cursor-pointer hover:shadow-glow-sm transition-all"
                          onClick={() => navigate(`/project/${project.id}`)}
                        >
                          <CardHeader>
                            <CardTitle>{project.name}</CardTitle>
                            <CardDescription>
                              {models.filter(m => m.projectId === project.id).length} models
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="recent" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {models.slice(0, 6).map((model) => (
                        <Card 
                          key={model.id}
                          className="dark-glass cursor-pointer hover:shadow-glow-sm transition-all"
                          onClick={() => navigate(`/models/${model.id}`)}
                        >
                          <CardHeader>
                            <CardTitle>{model.name}</CardTitle>
                            <CardDescription>
                              {model.nodes.length} nodes · {model.edges.length} connections
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
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
    </div>
  );
}
