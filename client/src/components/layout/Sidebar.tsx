import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Project, FCMModel } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  
  // Fetch projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  
  // Extract current model ID from URL if on model page
  const modelIdMatch = location.match(/\/models\/([^/]+)/);
  const currentModelId = modelIdMatch ? modelIdMatch[1] : null;
  
  // Find the current model to determine project
  const { data: models = [] } = useQuery<FCMModel[]>({
    queryKey: ["/api/models"],
  });
  
  const currentModel = models.find(model => model.id === currentModelId);
  const currentProjectId = currentModel?.projectId;
  
  return (
    <div className="dark-glass w-64 flex-shrink-0 flex flex-col border-r border-white/10 z-10">
      {/* Projects Section */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-300">projects</h2>
          <button className="text-secondary hover:text-white p-1 rounded-md hover:bg-white/10">
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
                project.id === currentProjectId 
                  ? "bg-white/10 shadow-glow-sm border border-secondary/20" 
                  : "hover:shadow-glow-sm"
              )}
              onClick={() => setLocation(`/?project=${project.id}`)}
            >
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">{project.name.toLowerCase()}</div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-xs p-1 hover:bg-white/10 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="19" cy="12" r="1"></circle>
                      <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                  </button>
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
          <button className="text-secondary hover:text-white p-1 rounded-md hover:bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        
        {/* Model List */}
        <div className="space-y-2">
          {models
            .filter(model => !currentProjectId || model.projectId === currentProjectId)
            .map((model) => (
              <Link key={model.id} href={`/models/${model.id}`}>
                <a className={cn(
                  "glass rounded-md p-2 cursor-pointer group transition-all block",
                  model.id === currentModelId 
                    ? "bg-white/10 shadow-glow-sm border border-secondary/20" 
                    : "hover:shadow-glow-sm"
                )}>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">{model.name.toLowerCase()}</div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-xs p-1 hover:bg-white/10 rounded" onClick={(e) => e.preventDefault()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1"></circle>
                          <circle cx="19" cy="12" r="1"></circle>
                          <circle cx="5" cy="12" r="1"></circle>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {model.nodes.length} nodes · {model.edges.length} connections
                  </div>
                </a>
              </Link>
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
    </div>
  );
}
