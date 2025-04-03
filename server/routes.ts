import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import fetch from "node-fetch";
import {
  insertProjectSchema,
  insertModelSchema,
  insertScenarioSchema,
} from "@shared/schema";

// Python simulation service URL
const PYTHON_SIM_URL = process.env.PYTHON_SIM_URL || 'http://localhost:5050';

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  // Projects
  app.get("/api/projects", async (_req: Request, res: Response) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validatedData);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const result = await storage.deleteProject(id);
      if (!result) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Models
  app.get("/api/models", async (_req: Request, res: Response) => {
    try {
      const models = await storage.getModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  app.get("/api/projects/:projectId/models", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const models = await storage.getModelsByProject(projectId);
      res.json(models);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  app.get("/api/models/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid model ID" });
      }

      const model = await storage.getModel(id);
      if (!model) {
        return res.status(404).json({ message: "Model not found" });
      }

      res.json(model);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch model" });
    }
  });

  app.post("/api/models", async (req: Request, res: Response) => {
    try {
      const validatedData = insertModelSchema.parse(req.body);
      const model = await storage.createModel(validatedData);
      res.status(201).json(model);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create model" });
    }
  });

  app.put("/api/models/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid model ID" });
      }

      const validatedData = insertModelSchema.partial().parse(req.body);
      const model = await storage.updateModel(id, validatedData);
      
      if (!model) {
        return res.status(404).json({ message: "Model not found" });
      }

      res.json(model);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update model" });
    }
  });

  app.delete("/api/models/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid model ID" });
      }

      const result = await storage.deleteModel(id);
      if (!result) {
        return res.status(404).json({ message: "Model not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete model" });
    }
  });

  // Scenarios
  app.get("/api/scenarios", async (_req: Request, res: Response) => {
    try {
      const scenarios = await storage.getScenarios();
      res.json(scenarios);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scenarios" });
    }
  });

  app.get("/api/models/:modelId/scenarios", async (req: Request, res: Response) => {
    try {
      const modelId = parseInt(req.params.modelId);
      if (isNaN(modelId)) {
        return res.status(400).json({ message: "Invalid model ID" });
      }

      const scenarios = await storage.getScenariosByModel(modelId);
      res.json(scenarios);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scenarios" });
    }
  });

  app.get("/api/scenarios/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scenario ID" });
      }

      const scenario = await storage.getScenario(id);
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      res.json(scenario);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scenario" });
    }
  });

  app.post("/api/scenarios", async (req: Request, res: Response) => {
    try {
      const validatedData = insertScenarioSchema.parse(req.body);
      const scenario = await storage.createScenario(validatedData);
      res.status(201).json(scenario);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create scenario" });
    }
  });

  app.delete("/api/scenarios/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scenario ID" });
      }

      const result = await storage.deleteScenario(id);
      if (!result) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete scenario" });
    }
  });

  // Python Simulation API Proxy
  app.post("/api/simulate", async (req: Request, res: Response) => {
    try {
      const response = await fetch(`${PYTHON_SIM_URL}/api/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json() as any;
      
      // If Python service returns an error
      if (!response.ok) {
        console.error('Python simulation error:', data);
        return res.status(response.status).json(data);
      }
      
      // Create a properly formatted response object with expected structure
      const responseData = {
        finalValues: data.finalValues || {},
        timeSeriesData: data.timeSeriesData || {},
        iterations: data.iterations || 0,
        converged: data.converged || false
      };
      
      res.json(responseData);
    } catch (error) {
      console.error('Failed to connect to Python simulation service:', error);
      res.status(503).json({ 
        message: "Python simulation service unavailable",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Python Analysis API Proxy
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const response = await fetch(`${PYTHON_SIM_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json() as any;
      
      // If Python service returns an error
      if (!response.ok) {
        console.error('Python analysis error:', data);
        return res.status(response.status).json(data);
      }
      
      // Create a properly formatted response object with expected structure
      const responseData = {
        nodeCount: data.nodeCount || 0,
        edgeCount: data.edgeCount || 0,
        density: data.density || 0,
        isConnected: data.isConnected || false,
        hasLoop: data.hasLoop || false,
        centrality: data.centrality || {
          degree: {},
          inDegree: {},
          outDegree: {},
          betweenness: {},
          closeness: {}
        },
        adjacencyMatrix: data.adjacencyMatrix || [],
        nodeIds: data.nodeIds || []
      };
      
      res.json(responseData);
    } catch (error) {
      console.error('Failed to connect to Python analysis service:', error);
      res.status(503).json({ 
        message: "Python analysis service unavailable",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Python Health Check
  app.get("/api/python-health", async (_req: Request, res: Response) => {
    try {
      const response = await fetch(`${PYTHON_SIM_URL}/api/health`);
      
      if (!response.ok) {
        return res.status(503).json({ 
          status: "unavailable",
          message: "Python service is not healthy"
        });
      }
      
      const data = await response.json() as any;
      const responseObj = { 
        status: "available",
        pythonStatus: data?.status || 'ok' 
      };
      res.json(responseObj);
    } catch (error) {
      console.error('Python service health check failed:', error);
      res.status(503).json({ 
        status: "unavailable",
        message: "Python service is not reachable",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
