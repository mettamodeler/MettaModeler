import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import fetch from "node-fetch";
import {
  insertProjectSchema,
  insertModelSchema,
  insertScenarioSchema,
  FCMNode,
  FCMEdge,
  SimulationResult
} from "@shared/schema";
import { setupAuth, isAuthenticated } from "./auth";
import { exportService, ExportFormat, ExportType } from "./export";

// Python simulation service URL
const PYTHON_SIM_URL = process.env.PYTHON_SIM_URL || 'http://localhost:5050';

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

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
      
      // Type assertions to help TypeScript with nodes and edges
      const typedData = {
        ...validatedData,
        nodes: validatedData.nodes ? (validatedData.nodes as FCMNode[]) : undefined,
        edges: validatedData.edges ? (validatedData.edges as FCMEdge[]) : undefined
      };
      
      const model = await storage.createModel(typedData);
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
      
      // Type assertions to help TypeScript with nodes and edges
      const typedData = {
        ...validatedData,
        nodes: validatedData.nodes ? (validatedData.nodes as FCMNode[]) : undefined,
        edges: validatedData.edges ? (validatedData.edges as FCMEdge[]) : undefined
      };
      
      const model = await storage.updateModel(id, typedData);
      
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
      // Handle case where modelId might be a string but schema expects a number
      let data = { ...req.body };
      if (typeof data.modelId === 'string') {
        data.modelId = parseInt(data.modelId, 10);
      }
      
      const validatedData = insertScenarioSchema.parse(data);
      
      // Type assertions to help TypeScript with initialValues and results 
      const typedData = {
        ...validatedData,
        initialValues: validatedData.initialValues ? 
          (validatedData.initialValues as Record<string, number>) : undefined,
        results: validatedData.results ? {
          ...validatedData.results,
          finalValues: validatedData.results.finalValues as Record<string, number>,
          timeSeriesData: validatedData.results.timeSeriesData as Record<string, number[]>
        } as SimulationResult : undefined
      };
      
      const scenario = await storage.createScenario(typedData);
      res.status(201).json(scenario);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Failed to create scenario:", error);
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
      // Map Python API field names to match our frontend expectations
      const responseData: SimulationResult & {
        baselineFinalState?: Record<string, number>,
        baselineTimeSeries?: Record<string, number[]>,
        baselineIterations?: number,
        baselineConverged?: boolean,
        deltaState?: Record<string, number>
      } = {
        finalValues: data.finalState || data.finalValues || {},
        timeSeriesData: data.timeSeries || data.timeSeriesData || {},
        iterations: data.iterations || 0,
        converged: data.converged || false,
        // Include baseline data if available
        baselineFinalState: data.baselineFinalState || {},
        baselineTimeSeries: data.baselineTimeSeries || {},
        baselineIterations: data.baselineIterations || 0,
        baselineConverged: data.baselineConverged || false,
        deltaState: data.deltaState || {}
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

  // Export Model to File
  app.post("/api/export/model/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid model ID" });
      }

      // Get the model data - either from the database or from the request body
      let model;
      
      if (req.body && Object.keys(req.body).length > 0) {
        // Use the enhanced model data from the request body if available
        console.log("Using enhanced model data from request body");
        model = req.body;
      } else {
        // Fallback to database model if no request body provided
        console.log("Using model data from database");
        model = await storage.getModel(id);
        if (!model) {
          return res.status(404).json({ message: "Model not found" });
        }
      }

      // Get export options from query parameters or request body
      const format = (req.query.format as ExportFormat) || 
                     (req.body.format as ExportFormat) || 
                     ExportFormat.JSON;
      const fileName = req.body.fileName || `model_${id}`;

      // Generate the export file
      const result = await exportService.generateExport(model, {
        format,
        type: ExportType.MODEL,
        modelId: id,
        fileName
      });

      // Set appropriate headers based on format
      res.set({
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Content-Type': result.mimeType
      });

      // Send the file
      res.send(result.buffer);
    } catch (error) {
      console.error('Export model error:', error);
      res.status(500).json({ 
        message: "Failed to export model",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Export Scenario to File
  app.post("/api/export/scenario/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scenario ID" });
      }

      // Get the scenario data
      const scenario = await storage.getScenario(id);
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      // Get export options from request body
      const format = req.body.format as ExportFormat || ExportFormat.JSON;
      const fileName = req.body.fileName || `scenario_${id}`;

      // Generate the export file
      const result = await exportService.generateExport(scenario, {
        format,
        type: ExportType.SCENARIO,
        modelId: scenario.modelId ? scenario.modelId : undefined,
        scenarioId: id,
        fileName
      });

      // Set appropriate headers based on format
      res.set({
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Content-Type': result.mimeType
      });

      // Send the file
      res.send(result.buffer);
    } catch (error) {
      console.error('Export scenario error:', error);
      res.status(500).json({ 
        message: "Failed to export scenario",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Export Analysis to File
  app.post("/api/export/analysis", async (req: Request, res: Response) => {
    try {
      // Analysis data should be in the request body
      const analysisData = req.body.data;
      if (!analysisData) {
        return res.status(400).json({ message: "Analysis data required" });
      }

      // Get export options from request body
      const format = req.body.format as ExportFormat || ExportFormat.JSON;
      const fileName = req.body.fileName || `analysis_${new Date().getTime()}`;
      const modelId = parseInt(req.body.modelId as string) || undefined;

      // Generate the export file
      const result = await exportService.generateExport(analysisData, {
        format,
        type: ExportType.ANALYSIS,
        modelId,
        fileName
      });

      // Set appropriate headers based on format
      res.set({
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Content-Type': result.mimeType
      });

      // Send the file
      res.send(result.buffer);
    } catch (error) {
      console.error('Export analysis error:', error);
      res.status(500).json({ 
        message: "Failed to export analysis",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Export Comparison to File (between two scenarios)
  app.post("/api/export/comparison", async (req: Request, res: Response) => {
    try {
      // Comparison data should be in the request body
      const comparisonData = req.body.data;
      if (!comparisonData) {
        return res.status(400).json({ message: "Comparison data required" });
      }

      // Get export options from request body
      const format = req.body.format as ExportFormat || ExportFormat.JSON;
      const fileName = req.body.fileName || `comparison_${new Date().getTime()}`;
      const modelId = parseInt(req.body.modelId as string) || undefined;
      const scenarioId = parseInt(req.body.scenarioId as string) || undefined;
      const comparisonScenarioId = parseInt(req.body.comparisonScenarioId as string) || undefined;

      // Generate the export file
      const result = await exportService.generateExport(comparisonData, {
        format,
        type: ExportType.COMPARISON,
        modelId,
        scenarioId,
        comparisonScenarioId,
        fileName
      });

      // Set appropriate headers based on format
      res.set({
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Content-Type': result.mimeType
      });

      // Send the file
      res.send(result.buffer);
    } catch (error) {
      console.error('Export comparison error:', error);
      res.status(500).json({ 
        message: "Failed to export comparison",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Export to Jupyter Notebook via Python service
  app.post("/api/export/notebook", async (req: Request, res: Response) => {
    try {
      // Forward request to Python service
      const response = await fetch(`${PYTHON_SIM_URL}/api/export/notebook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        console.error('Python notebook export error:', errorData);
        return res.status(response.status).json(errorData);
      }

      // Get the notebook data
      const data = await response.json() as any;
      
      // Return the notebook data
      res.json(data);
    } catch (error) {
      console.error('Export notebook error:', error);
      res.status(503).json({ 
        message: "Python notebook export service unavailable",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
