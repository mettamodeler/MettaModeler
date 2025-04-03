import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
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

export default function Home() {
  const { toast } = useToast();
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingModel, setIsCreatingModel] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelProjectId, setNewModelProjectId] = useState('');
  
  // Get projects and models
  const { data: projects = [], refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });
  
  const { data: models = [], refetch: refetchModels } = useQuery<FCMModel[]>({
    queryKey: ['/api/models'],
  });
  
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
        <Sidebar />
        
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">projects</h1>
                <Button 
                  variant="secondary" 
                  onClick={() => setIsCreatingProject(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  New Project
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <Card key={project.id} className="glass transition-shadow hover:shadow-glow-sm">
                    <CardHeader>
                      <CardTitle>{project.name.toLowerCase()}</CardTitle>
                      <CardDescription>
                        {models.filter(m => m.projectId === project.id).length} models
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setNewModelProjectId(project.id.toString());
                          setIsCreatingModel(true);
                        }}
                        className="mr-2"
                      >
                        Add Model
                      </Button>
                      <Button variant="ghost">View All</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">recent models</h1>
                <Button 
                  variant="secondary"
                  onClick={() => setIsCreatingModel(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  New Model
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {models.slice(0, 6).map((model) => {
                  const project = projects.find(p => p.id === model.projectId);
                  
                  return (
                    <Link key={model.id} href={`/models/${model.id}`}>
                      <a className="block">
                        <Card className="glass transition-shadow hover:shadow-glow-sm h-full">
                          <CardHeader>
                            <CardTitle>{model.name.toLowerCase()}</CardTitle>
                            <CardDescription>
                              {project?.name || 'Unknown Project'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm text-gray-400">
                              {model.nodes.length} nodes · {model.edges.length} connections
                            </div>
                          </CardContent>
                        </Card>
                      </a>
                    </Link>
                  );
                })}
              </div>
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
