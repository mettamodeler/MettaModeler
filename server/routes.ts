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
  SimulationResult,
  SimulationNode
} from "@shared/schema";
import { setupAuth, isAuthenticated } from "./auth";
import { exportService, ExportFormat, ExportType } from "./export";
import { SimulationResult as PythonSimulationResult } from './types';
import axios, { AxiosError } from "axios";
import { ProjectSchema, ProjectStorageSchema, type ProjectStorage } from './types/Project.v2.zod';
import { ModelSchema, ModelStorageSchema, type ModelStorage } from './types/Model.v2.zod';
import { ScenarioSchema, ScenarioStorageSchema, type ScenarioStorage } from './types/Scenario.v2.zod';
import { CreateModelSchema } from './types/Model.v2.zod';
import { CreateScenarioSchema } from './types/Scenario.v2.zod';

// Python simulation service URL
const PYTHON_SIM_URL = process.env.PYTHON_SIM_URL || 'http://localhost:5050';

interface SimulationResponse {
  finalState: Record<string, number>;
  timeSeries: Record<string, number[]>;
  iterations: number;
  converged: boolean;
}

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
      // Validate request body first
      const result = ProjectSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          status: 400,
          code: 'INVALID_PAYLOAD',
          fieldErrors: result.error.errors
        });
      }

      // Convert API schema to storage schema
      const storageData = {
        name: result.data.name,
        description: result.data.description || null,
        createdAt: new Date(result.data.createdAt),
        updatedAt: null,
        userId: null
      };

      const project = await storage.createProject(storageData);
      res.status(201).json(project);
    } catch (error) {
      console.error('Project creation error:', error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const result = ProjectSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          status: 400,
          code: 'INVALID_PAYLOAD',
          fieldErrors: result.error.errors
        });
      }
      
      // Convert API schema to storage schema
      const storageData: Partial<ProjectStorage> = {};
      if (result.data.name) storageData.name = result.data.name;
      if (result.data.description !== undefined) storageData.description = result.data.description || null;
      if (result.data.updatedAt) storageData.updatedAt = new Date(result.data.updatedAt);
      
      const project = await storage.updateProject(id, storageData);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
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
      const result = CreateModelSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          status: 400,
          code: 'INVALID_PAYLOAD',
          fieldErrors: result.error.errors
        });
      }

      // Generate fields on the server
      const now = new Date();
      // Let the DB autoincrement the id
      const storageData = {
        ...result.data,
        createdAt: now,
        updatedAt: now
      };

      const model = await storage.createModel(storageData);
      res.status(201).json(model);
    } catch (error) {
      res.status(500).json({ message: "Failed to create model" });
    }
  });

  app.put("/api/models/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid model ID" });
      }

      const result = ModelSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          status: 400,
          code: 'INVALID_PAYLOAD',
          fieldErrors: result.error.errors
        });
      }
      
      // Convert API schema to storage schema
      const storageData: Partial<ModelStorage> = {};
      if (result.data.projectId !== undefined) storageData.projectId = result.data.projectId;
      if (result.data.name) storageData.name = result.data.name;
      if (result.data.description !== undefined) storageData.description = result.data.description || null;
      if (result.data.nodes) storageData.nodes = result.data.nodes;
      if (result.data.edges) storageData.edges = result.data.edges;
      if (result.data.updatedAt) storageData.updatedAt = new Date(result.data.updatedAt);
      
      const model = await storage.updateModel(id, storageData);
      
      if (!model) {
        return res.status(404).json({ message: "Model not found" });
      }

      res.json(model);
    } catch (error) {
      console.error('Model update error:', error);
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
      const result = CreateScenarioSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          status: 400,
          code: 'INVALID_PAYLOAD',
          fieldErrors: result.error.errors
        });
      }

      // Generate fields on the server
      const now = new Date();
      // Let the DB autoincrement the id
      const storageData = {
        ...result.data,
        schemaVersion: '1.0.0',
        createdAt: now,
        updatedAt: now
      };

      const scenario = await storage.createScenario(storageData);
      res.status(201).json(scenario);
    } catch (error) {
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
      // Build payload for Python backend
      const payload: any = {
        schemaVersion: req.body.schemaVersion,
        nodes: req.body.nodes,
        edges: req.body.edges,
        activation: req.body.activation,
        threshold: req.body.threshold,
        maxIterations: req.body.maxIterations,
        clampedNodes: req.body.clampedNodes,
        // Only include modelInitialValues and scenarioInitialValues if compareToBaseline is true
        ...(req.body.compareToBaseline
          ? {
              compareToBaseline: true,
              modelInitialValues: req.body.modelInitialValues,
              scenarioInitialValues: req.body.scenarioInitialValues
            }
          : {})
      };
      const response = await axios.post(`${PYTHON_SIM_URL}/api/simulate`, payload);
      return res.json(response.data);
    } catch (error) {
      console.error('Simulation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({
        error: 'Failed to run simulation',
        message: errorMessage
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

  // Direct Excel Export
  app.post("/api/export/excel", async (req: Request, res: Response) => {
    try {
      const { data, type, fileName } = req.body;
      
      // Validate input
      if (!data || !type) {
        return res.status(400).json({ error: 'Missing required data' });
      }

      // Call Python service
      const response = await fetch(`${PYTHON_SIM_URL}/api/export/excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data, type }),
      });

      if (!response.ok) {
        throw new Error(`Python service responded with status: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      
      // Set filename in Content-Disposition header
      const safeFileName = fileName || 'model_export';
      res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Error in /api/export/excel:', error);
      res.status(500).json({ error: 'Failed to export to Excel' });
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

  // Update the export route to use correct field names
  app.post("/api/export", async (req: Request, res: Response) => {
    try {
      const { format, type, data } = req.body as {
        format: ExportFormat;
        type: ExportType;
        data: SimulationResult;
      };

      const result = await exportService.generateExport(data, {
        format,
        type,
        fileName: `export_${new Date().getTime()}`
      });

      res.set({
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Content-Type': result.mimeType
      });

      res.send(result.buffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
