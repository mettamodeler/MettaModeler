import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import fetch from "node-fetch";
import {
  insertProjectSchema,
  insertModelSchema,
  insertScenarioSchema
} from "@shared/schema";
import {
  FCMNode,
  FCMEdge,
  SimulationResult,
  SimulationNode
} from "@shared/generated";
import { setupAuth, isAuthenticated } from "./auth";
import { exportService, ExportFormat, ExportType } from "./export";
import { SimulationResult as PythonSimulationResult } from './types';
import axios, { AxiosError } from "axios";
import { ProjectSchema, ProjectStorageSchema, type ProjectStorage } from './types/generated/Project.v1.zod';
import { ModelSchema, ModelStorageSchema, type ModelStorage, CreateModelSchema } from './types/generated/Model.v1.zod';
import { ScenarioSchema, ScenarioStorageSchema, type ScenarioStorage, CreateScenarioSchema } from './types/generated/Scenario.v1.zod';
import { CreateModelData, CreateScenarioData } from './storage';

// Python simulation service URL
// Normalize localhost to 127.0.0.1 to force IPv4 (avoid IPv6 resolution issues)
const PYTHON_SIM_URL = (process.env.PYTHON_SIM_URL || 'http://127.0.0.1:5050').replace(/localhost/g, '127.0.0.1');

interface SimulationResponse {
  finalState: Record<string, number>;
  timeSeries: Record<string, number[]>;
  iterations: number;
  converged: boolean;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  const getUserIdOrRespond = (req: Request, res: Response): number | null => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authenticated" });
      return null;
    }
    return userId;
  };

  const getOwnedProjectOrRespond = async (projectId: number, userId: number, res: Response) => {
    const project = await storage.getProject(projectId);
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return null;
    }
    if (project.userId !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return null;
    }
    return project;
  };

  const getOwnedModelOrRespond = async (modelId: number, userId: number, res: Response) => {
    const model = await storage.getModel(modelId);
    if (!model || !model.projectId) {
      res.status(404).json({ message: "Model not found" });
      return null;
    }
    const project = await storage.getProject(model.projectId);
    if (!project || project.userId !== userId) {
      res.status(404).json({ message: "Model not found" });
      return null;
    }
    return model;
  };

  const getOwnedScenarioOrRespond = async (scenarioId: number, userId: number, res: Response) => {
    const scenario = await storage.getScenario(scenarioId);
    if (!scenario) {
      res.status(404).json({ message: "Scenario not found" });
      return null;
    }
    if (!scenario.modelId) {
      res.status(404).json({ message: "Scenario not found" });
      return null;
    }
    const model = await getOwnedModelOrRespond(scenario.modelId, userId, res);
    if (!model) return null;
    return scenario;
  };

  // API routes
  // Projects
  app.get("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const userProjects = await storage.getProjectsByUser(userId);
      res.json(userProjects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const project = await getOwnedProjectOrRespond(id, userId, res);
      if (!project) return;

      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const now = new Date();
      const project = {
        name: req.body.name,
        description: req.body.description || null,
        userId,
        createdAt: now,
        updatedAt: now
      };

      const result = ProjectSchema.safeParse(project);
      if (!result.success) {
        return res.status(400).json({
          status: 400,
          code: 'INVALID_PAYLOAD',
          fieldErrors: result.error.errors
        });
      }

      const created = await storage.createProject(result.data);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const ownsProject = await getOwnedProjectOrRespond(id, userId, res);
      if (!ownsProject) return;

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

  app.delete("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const ownsProject = await getOwnedProjectOrRespond(id, userId, res);
      if (!ownsProject) return;

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
  app.get("/api/models", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const userModels = await storage.getModelsByUser(userId);
      res.json(userModels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  app.get("/api/projects/:projectId/models", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const project = await getOwnedProjectOrRespond(projectId, userId, res);
      if (!project) return;

      const models = await storage.getModelsByProject(projectId);
      res.json(models);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  app.get("/api/models/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid model ID" });
      }

      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const model = await getOwnedModelOrRespond(id, userId, res);
      if (!model) return;

      res.json(model);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch model" });
    }
  });

  app.post("/api/models", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const result = CreateModelSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          status: 400,
          code: 'INVALID_PAYLOAD',
          fieldErrors: result.error.errors
        });
      }

      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const ownsProject = await getOwnedProjectOrRespond(result.data.projectId, userId, res);
      if (!ownsProject) return;

      // Generate fields on the server
      const now = new Date();
      // Convert CreateModelSchema result to CreateModelData
      const modelData: CreateModelData = {
        name: result.data.name,
        description: result.data.description || null,
        projectId: result.data.projectId,
        nodes: result.data.nodes || [],
        edges: result.data.edges || [],
      };

      const model = await storage.createModel(modelData);
      res.status(201).json(model);
    } catch (error) {
      res.status(500).json({ message: "Failed to create model" });
    }
  });

  app.put("/api/models/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid model ID" });
      }

      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const ownsModel = await getOwnedModelOrRespond(id, userId, res);
      if (!ownsModel) return;

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
      if (result.data.projectId !== undefined) {
        const targetProject = await getOwnedProjectOrRespond(result.data.projectId, userId, res);
        if (!targetProject) return;
        storageData.projectId = result.data.projectId;
      }
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

  app.delete("/api/models/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid model ID" });
      }

      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const ownsModel = await getOwnedModelOrRespond(id, userId, res);
      if (!ownsModel) return;

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
  app.get("/api/scenarios", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const userScenarios = await storage.getScenariosByUser(userId);
      // Transform and validate each scenario to ensure API consistency
      const safeScenarios = userScenarios.map(scenario => {
        // Transform the scenario data to match API format
        const transformed = {
          ...scenario,
          initialValues: scenario.initialValues || {},
          clampedNodes: Array.isArray(scenario.clampedNodes) ? scenario.clampedNodes : [],
          nodes: Array.isArray(scenario.nodes) ? scenario.nodes : [],
          createdAt: scenario.createdAt instanceof Date 
            ? scenario.createdAt.toISOString() 
            : (typeof scenario.createdAt === 'string' ? scenario.createdAt : ""),
          updatedAt: scenario.updatedAt instanceof Date 
            ? scenario.updatedAt.toISOString() 
            : (scenario.updatedAt === null || scenario.updatedAt === undefined ? null : String(scenario.updatedAt)),
        };
        
        // Use safeParse to avoid throwing errors
        const result = ScenarioSchema.safeParse(transformed);
        if (result.success) {
          return result.data;
        } else {
          console.error("Error validating scenario:", result.error, transformed);
          // Return the transformed data even if validation fails
          return transformed;
        }
      });
      res.json(safeScenarios);
    } catch (error) {
      console.error("Failed to fetch scenarios:", error);
      res.status(500).json({ message: "Failed to fetch scenarios", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/models/:modelId/scenarios", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const modelId = parseInt(req.params.modelId);
      if (isNaN(modelId)) {
        return res.status(400).json({ message: "Invalid model ID" });
      }

      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const ownsModel = await getOwnedModelOrRespond(modelId, userId, res);
      if (!ownsModel) return;

      const scenarios = await storage.getScenariosByModel(modelId);
      // Transform and validate each scenario to ensure API consistency
      const safeScenarios = scenarios.map(scenario => {
        // Transform the scenario data to match API format
        const transformed = {
          ...scenario,
          initialValues: scenario.initialValues || {},
          clampedNodes: Array.isArray(scenario.clampedNodes) ? scenario.clampedNodes : [],
          nodes: Array.isArray(scenario.nodes) ? scenario.nodes : [],
          createdAt: scenario.createdAt instanceof Date 
            ? scenario.createdAt.toISOString() 
            : (typeof scenario.createdAt === 'string' ? scenario.createdAt : ""),
          updatedAt: scenario.updatedAt instanceof Date 
            ? scenario.updatedAt.toISOString() 
            : (scenario.updatedAt === null || scenario.updatedAt === undefined ? null : String(scenario.updatedAt)),
        };
        
        // Use safeParse to avoid throwing errors
        const result = ScenarioSchema.safeParse(transformed);
        if (result.success) {
          return result.data;
        } else {
          console.error("Error validating scenario:", result.error, transformed);
          // Return the transformed data even if validation fails
          return transformed;
        }
      });
      res.json(safeScenarios);
    } catch (error) {
      console.error("Failed to fetch scenarios:", error);
      res.status(500).json({ message: "Failed to fetch scenarios", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/scenarios/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scenario ID" });
      }

      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const scenario = await getOwnedScenarioOrRespond(id, userId, res);
      if (!scenario) return;
      
      // Transform the scenario data to match API format
      const transformed = {
        ...scenario,
        initialValues: scenario.initialValues || {},
        clampedNodes: Array.isArray(scenario.clampedNodes) ? scenario.clampedNodes : [],
        nodes: Array.isArray(scenario.nodes) ? scenario.nodes : [],
        createdAt: scenario.createdAt instanceof Date 
          ? scenario.createdAt.toISOString() 
          : (typeof scenario.createdAt === 'string' ? scenario.createdAt : ""),
        updatedAt: scenario.updatedAt instanceof Date 
          ? scenario.updatedAt.toISOString() 
          : (scenario.updatedAt === null || scenario.updatedAt === undefined ? null : String(scenario.updatedAt)),
      };
      
      // Use safeParse to avoid throwing errors
      const result = ScenarioSchema.safeParse(transformed);
      if (result.success) {
        res.json(result.data);
      } else {
        console.error("Error validating scenario:", result.error, transformed);
        // Return the transformed data even if validation fails
        res.json(transformed);
      }
    } catch (error) {
      console.error("Failed to fetch scenario:", error);
      res.status(500).json({ message: "Failed to fetch scenario", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/scenarios", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const now = new Date();

      // Validate only the user-supplied fields
      const result = CreateScenarioSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          status: 400,
          code: 'INVALID_PAYLOAD',
          fieldErrors: result.error.errors
        });
      }

      // Compose the full scenario object for storage
      // Convert CreateScenarioSchema result to CreateScenarioData
      const scenarioData: CreateScenarioData = {
        name: result.data.name,
        modelId: result.data.modelId,
        description: result.data.description || null,
        nodes: result.data.nodes || [],
        initialValues: result.data.initialValues || {},
        clampedNodes: result.data.clampedNodes || [],
        simulationParams: result.data.simulationParams,
        results: result.data.results,
      };

      const ownsModel = await getOwnedModelOrRespond(result.data.modelId, userId, res);
      if (!ownsModel) return;

      const scenario = await storage.createScenario(scenarioData);
      const safeScenario = ScenarioSchema.parse(scenario);
      res.status(201).json(safeScenario);
    } catch (error) {
      res.status(500).json({ message: "Failed to create scenario", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/scenarios/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scenario ID" });
      }

      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const ownsScenario = await getOwnedScenarioOrRespond(id, userId, res);
      if (!ownsScenario) return;

      if (req.body?.modelId !== undefined) {
        const targetModelId = Number(req.body.modelId);
        if (Number.isNaN(targetModelId)) {
          return res.status(400).json({ message: "Invalid model ID" });
        }
        const ownsModel = await getOwnedModelOrRespond(targetModelId, userId, res);
        if (!ownsModel) return;
      }

      const scenario = await storage.updateScenario(id, req.body);
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }
      const safeScenario = ScenarioSchema.parse(scenario);
      res.json(safeScenario);
    } catch (error) {
      res.status(500).json({ message: "Failed to update scenario", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/scenarios/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scenario ID" });
      }

      const userId = getUserIdOrRespond(req, res);
      if (!userId) return;

      const ownsScenario = await getOwnedScenarioOrRespond(id, userId, res);
      if (!ownsScenario) return;

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
      // Validate required fields
      if (!req.body.nodes || !Array.isArray(req.body.nodes)) {
        return res.status(400).json({
          error: 'Invalid payload',
          message: 'Missing or invalid nodes array'
        });
      }

      if (!req.body.edges || !Array.isArray(req.body.edges)) {
        return res.status(400).json({
          error: 'Invalid payload',
          message: 'Missing or invalid edges array'
        });
      }

      // Only add schemaVersion if missing, do not override any other fields
      const payload = {
        ...req.body,
        schemaVersion: req.body.schemaVersion || "1.0.0"
      };

      // Forward to Python backend
      const response = await axios.post(`${PYTHON_SIM_URL}/api/simulate`, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Return the response data directly
      return res.json(response.data);
    } catch (error) {
      console.error('Simulation error:', error);
      if (axios.isAxiosError(error)) {
        // If it's an Axios error, forward the Python service's error message
        return res.status(error.response?.status || 500).json({
          error: 'Failed to run simulation',
          message: error.response?.data?.message || error.message
        });
      }
      // For other errors, return a generic error
      return res.status(500).json({
        error: 'Failed to run simulation',
        message: error instanceof Error ? error.message : 'Unknown error'
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
        model = req.body;
      } else {
        // Fallback to database model if no request body provided
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
