import { 
  User, InsertUser, 
  Project, InsertProject, 
  Model, InsertModel, 
  Scenario, InsertScenario,
  FCMNode,
  FCMEdge,
  SimulationResult,
  SimulationParameters,
  users,
  projects,
  models,
  scenarios
} from "@shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from 'drizzle-orm';
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import pg from "pg";
import { ModelStorageSchema, ModelStorage } from './types/Model.v1.zod';
import { ScenarioStorageSchema, type ScenarioStorage } from './types/Scenario.v1.zod';
import { db } from "./db";
const { Pool } = pg;

export interface IStorage {
  // Session storage
  sessionStore: any; // Using any to avoid complex typings with express-session

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project operations
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Model operations
  getModels(): Promise<Model[]>;
  getModelsByProject(projectId: number): Promise<Model[]>;
  getModel(id: number): Promise<Model | undefined>;
  createModel(model: InsertModel): Promise<Model>;
  updateModel(id: number | string, updates: Partial<Model>): Promise<Model | undefined>;
  deleteModel(id: number): Promise<boolean>;
  
  // Scenario operations
  getScenarios(): Promise<Scenario[]>;
  getScenariosByModel(modelId: number): Promise<Scenario[]>;
  getScenario(id: number): Promise<Scenario | undefined>;
  createScenario(scenario: ScenarioStorage): Promise<Scenario>;
  deleteScenario(id: number): Promise<boolean>;
}

export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  sessionStore: any;
  
  constructor() {
    // Create a PostgreSQL connection
    const queryClient = postgres(process.env.DATABASE_URL || "");
    this.db = drizzle(queryClient);
    
    // Create PostgreSQL session store
    const PostgresSessionStore = connectPg(session);
    const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.sessionStore = new PostgresSessionStore({ 
      pool: pgPool, 
      tableName: 'user_sessions', 
      createTableIfMissing: true 
    });
  }

  // USER OPERATIONS
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }
  
  // PROJECT OPERATIONS
  async getProjects(): Promise<Project[]> {
    return await this.db.select().from(projects);
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    const result = await this.db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }
  
  async createProject(insertProject: InsertProject): Promise<Project> {
    const result = await this.db.insert(projects).values(insertProject).returning();
    return result[0];
  }
  
  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const result = await this.db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }
  
  async deleteProject(id: number): Promise<boolean> {
    try {
      // First, get all models associated with this project
      const projectModels = await this.db.select().from(models).where(eq(models.projectId, id));
      
      // Delete all scenarios associated with these models first
      for (const model of projectModels) {
        await this.db.delete(scenarios).where(eq(scenarios.modelId, model.id));
      }
      
      // Then delete all associated models
      await this.db.delete(models).where(eq(models.projectId, id));
      
      // Finally, delete the project itself
      const result = await this.db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting project:", error);
      return false;
    }
  }
  
  // MODEL OPERATIONS
  async getModels(): Promise<Model[]> {
    return await this.db.select().from(models);
  }
  
  async getModelsByProject(projectId: number): Promise<Model[]> {
    return await this.db.select().from(models).where(eq(models.projectId, projectId));
  }
  
  async getModel(id: number): Promise<Model | undefined> {
    const result = await this.db.select().from(models).where(eq(models.id, id));
    return result[0];
  }
  
  async createModel(insertModel: InsertModel): Promise<Model> {
    // Ensure nodes and edges are arrays of FCMNode/FCMEdge
    const typedNodes: FCMNode[] = Array.isArray(insertModel.nodes) ? insertModel.nodes as FCMNode[] : [];
    const typedEdges: FCMEdge[] = Array.isArray(insertModel.edges) ? insertModel.edges as FCMEdge[] : [];
    const dbResult = await this.db.insert(models).values({
      ...insertModel,
      nodes: typedNodes,
      edges: typedEdges
    }).returning();
    return dbResult[0];
  }
  
  async updateModel(id: number | string, updates: Partial<Model>): Promise<Model | undefined> {
    // Convert string ID to number if needed
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numericId)) {
      throw new Error('Invalid model ID');
    }

    // Convert API model to storage model
    const storageUpdates: Partial<ModelStorage> = {
      updatedAt: new Date()
    };

    if (updates.name) storageUpdates.name = updates.name;
    if (updates.description !== undefined) storageUpdates.description = updates.description;
    if (updates.nodes) storageUpdates.nodes = updates.nodes;
    if (updates.edges) storageUpdates.edges = updates.edges;
    if (updates.id) storageUpdates.id = parseInt(updates.id, 10);
    if (updates.projectId) storageUpdates.projectId = parseInt(updates.projectId, 10);
    
    const dbResult = await this.db.update(models)
      .set(storageUpdates)
      .where(eq(models.id, numericId))
      .returning();

    if (!dbResult[0]) return undefined;

    // Convert storage model back to API model
    const model = dbResult[0];
    return {
      schemaVersion: "1.0.0",
      id: model.id.toString(),
      projectId: model.projectId?.toString() || "0",
      name: model.name,
      description: model.description || undefined,
      nodes: model.nodes || [],
      edges: model.edges || [],
      createdAt: model.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: model.updatedAt?.toISOString() || new Date().toISOString()
    };
  }
  
  async deleteModel(id: number): Promise<boolean> {
    try {
      // First delete all scenarios associated with this model
      await this.db.delete(scenarios).where(eq(scenarios.modelId, id));
      
      // Then delete the model
      const result = await this.db.delete(models).where(eq(models.id, id)).returning({ id: models.id });
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting model:", error);
      return false;
    }
  }
  
  // SCENARIO OPERATIONS
  async getScenarios(): Promise<Scenario[]> {
    const results = await this.db.select().from(scenarios);
    return results.map(s => ({ ...s, clampedNodes: s.clampedNodes || [] }));
  }
  
  async getScenariosByModel(modelId: number): Promise<Scenario[]> {
    const results = await this.db.select().from(scenarios).where(eq(scenarios.modelId, modelId));
    return results.map(s => ({ ...s, clampedNodes: s.clampedNodes || [] }));
  }
  
  async getScenario(id: number): Promise<Scenario | undefined> {
    const result = await this.db.select().from(scenarios).where(eq(scenarios.id, id));
    if (!result[0]) return undefined;
    return { ...result[0], clampedNodes: result[0].clampedNodes || [] };
  }
  
  async createScenario(scenario: ScenarioStorage): Promise<Scenario> {
    // Generate a new id if not provided
    const id = scenario.id ?? this.scenarioId++;
    const now = scenario.createdAt instanceof Date ? scenario.createdAt : new Date();
    const updatedAt = scenario.updatedAt instanceof Date ? scenario.updatedAt : (scenario.updatedAt ? new Date(scenario.updatedAt) : now);
    const scenarioObj: Scenario = {
      ...scenario,
      id,
      createdAt: now,
      updatedAt,
    };
    this.scenarios.set(id, scenarioObj);
    return scenarioObj;
  }
  
  async deleteScenario(id: number): Promise<boolean> {
    try {
      const result = await this.db.delete(scenarios).where(eq(scenarios.id, id)).returning({ id: scenarios.id });
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting scenario:", error);
      return false;
    }
  }

  async updateScenario(id: number, data: Partial<ScenarioStorage>): Promise<Scenario> {
    let fixedResults = undefined;
    if (data.results) {
      fixedResults = {
        ...data.results,
        initialValues: data.results.initialValues ?? {},
        timeSeries: Object.fromEntries(
          Object.entries(data.results.timeSeries ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v.map(Number) : []])
        ),
        finalState: data.results.finalState ?? {},
      };
    }
    const updatedAt = new Date();
    const dbData = {
      ...data,
      results: fixedResults,
      updatedAt
    };
    const [scenario] = await this.db.update(scenarios)
      .set(dbData)
      .where(eq(scenarios.id, id))
      .returning();
    return scenario;
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private models: Map<number, Model>;
  private scenarios: Map<number, Scenario>;
  
  private userId: number;
  private projectId: number;
  private modelId: number;
  private scenarioId: number;
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.models = new Map();
    this.scenarios = new Map();
    
    this.userId = 1;
    this.projectId = 1;
    this.modelId = 1;
    this.scenarioId = 1;
    
    // Create Memory session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Create demo data
    this.initializeDemoData();
  }

  // USER OPERATIONS
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user = { ...insertUser, id, displayName: insertUser.displayName || null, role: insertUser.role || null };
    this.users.set(id, user);
    return user;
  }
  
  // PROJECT OPERATIONS
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectId++;
    const now = new Date();
    
    const project: Project = { 
      id,
      name: insertProject.name,
      description: insertProject.description || null,
      userId: insertProject.userId || null,
      createdAt: now,
      updatedAt: now,
    };
    
    this.projects.set(id, project);
    return project;
  }
  
  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { 
      ...project, 
      ...updates,
      updatedAt: new Date(),
    };
    
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  async deleteProject(id: number): Promise<boolean> {
    // Get all models for this project
    const projectModels = Array.from(this.models.values())
      .filter(model => model.projectId === id);
    
    // Delete all scenarios for these models first
    for (const model of projectModels) {
      const scenariosToDelete = Array.from(this.scenarios.values())
        .filter(scenario => scenario.modelId === model.id);
      
      for (const scenario of scenariosToDelete) {
        this.scenarios.delete(scenario.id);
      }
      
      // Delete the model
      this.models.delete(model.id);
    }
    
    // Finally delete the project
    return this.projects.delete(id);
  }
  
  // MODEL OPERATIONS
  async getModels(): Promise<Model[]> {
    return Array.from(this.models.values());
  }
  
  async getModelsByProject(projectId: number): Promise<Model[]> {
    return Array.from(this.models.values())
      .filter(model => model.projectId === projectId);
  }
  
  async getModel(id: number): Promise<Model | undefined> {
    return this.models.get(id);
  }
  
  async createModel(insertModel: InsertModel): Promise<Model> {
    const id = this.modelId++;
    const now = new Date();
    
    // Type assertions to help TypeScript
    const typedNodes = insertModel.nodes ? (insertModel.nodes as unknown as FCMNode[]) : [];
    const typedEdges = insertModel.edges ? (insertModel.edges as unknown as FCMEdge[]) : [];
    
    const model: Model = { 
      id,
      name: insertModel.name,
      description: insertModel.description || null,
      projectId: insertModel.projectId || null,
      nodes: typedNodes,
      edges: typedEdges,
      createdAt: now,
      updatedAt: now,
    };
    
    this.models.set(id, model);
    return model;
  }
  
  async updateModel(id: number | string, updates: Partial<Model>): Promise<Model | undefined> {
    // Convert string ID to number if needed
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numericId)) {
      throw new Error('Invalid model ID');
    }

    const model = this.models.get(numericId);
    if (!model) return undefined;
    
    // Convert API model to storage model
    const storageUpdates: Partial<ModelStorage> = {
      updatedAt: new Date()
    };

    if (updates.name) storageUpdates.name = updates.name;
    if (updates.description !== undefined) storageUpdates.description = updates.description;
    if (updates.nodes) storageUpdates.nodes = updates.nodes;
    if (updates.edges) storageUpdates.edges = updates.edges;
    if (updates.id) storageUpdates.id = parseInt(updates.id, 10);
    if (updates.projectId) storageUpdates.projectId = parseInt(updates.projectId, 10);
    
    const updatedModel = { 
      ...model, 
      ...storageUpdates
    };
    
    this.models.set(numericId, updatedModel);

    // Convert storage model back to API model
    return {
      schemaVersion: "1.0.0",
      id: updatedModel.id.toString(),
      projectId: updatedModel.projectId?.toString() || "0",
      name: updatedModel.name,
      description: updatedModel.description || undefined,
      nodes: updatedModel.nodes || [],
      edges: updatedModel.edges || [],
      createdAt: updatedModel.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: updatedModel.updatedAt?.toISOString() || new Date().toISOString()
    };
  }
  
  async deleteModel(id: number): Promise<boolean> {
    // First delete all scenarios associated with this model
    const scenariosToDelete = Array.from(this.scenarios.values())
      .filter(scenario => scenario.modelId === id);
    
    for (const scenario of scenariosToDelete) {
      this.scenarios.delete(scenario.id);
    }
    
    // Then delete the model
    return this.models.delete(id);
  }
  
  // SCENARIO OPERATIONS
  async getScenarios(): Promise<Scenario[]> {
    return Array.from(this.scenarios.values()).map(s => ({
      ...s,
      clampedNodes: Array.isArray(s.clampedNodes) ? s.clampedNodes : [],
      simulationParams: s.simulationParams ?? null,
    }));
  }
  
  async getScenariosByModel(modelId: number): Promise<Scenario[]> {
    return Array.from(this.scenarios.values())
      .filter(scenario => scenario.modelId === modelId)
      .map(s => ({
        ...s,
        clampedNodes: Array.isArray(s.clampedNodes) ? s.clampedNodes : [],
        simulationParams: s.simulationParams ?? null,
      }));
  }
  
  async getScenario(id: number): Promise<Scenario | undefined> {
    const s = this.scenarios.get(id);
    if (!s) return undefined;
    return { ...s, clampedNodes: Array.isArray(s.clampedNodes) ? s.clampedNodes : [], simulationParams: s.simulationParams ?? null };
  }
  
  async createScenario(scenario: ScenarioStorage): Promise<Scenario> {
    // Generate a new id if not provided
    const id = scenario.id ?? this.scenarioId++;
    const now = scenario.createdAt instanceof Date ? scenario.createdAt : new Date();
    const updatedAt = scenario.updatedAt instanceof Date ? scenario.updatedAt : (scenario.updatedAt ? new Date(scenario.updatedAt) : now);
    const scenarioObj: Scenario = {
      ...scenario,
      id,
      createdAt: now,
      updatedAt,
    };
    this.scenarios.set(id, scenarioObj);
    return scenarioObj;
  }
  
  async deleteScenario(id: number): Promise<boolean> {
    return this.scenarios.delete(id);
  }
  
  // Demo data initialization
  private initializeDemoData() {
    // Create demo user
    const demoUser: User = {
      id: this.userId++,
      username: 'emma.wilson',
      password: 'password123', // not secure, just for demo
      displayName: 'Emma Wilson',
      role: 'researcher',
    };
    this.users.set(demoUser.id, demoUser);
    
    // Create demo projects
    const projects = [
      {
        name: 'Climate Adaptation',
        description: 'Models for climate adaptation strategies',
        userId: demoUser.id,
      },
      {
        name: 'Water Management',
        description: 'Hydrological system models',
        userId: demoUser.id,
      },
      {
        name: 'Social Networks',
        description: 'Social network influence models',
        userId: demoUser.id,
      },
    ];
    
    const createdProjects: Project[] = [];
    
    projects.forEach(project => {
      const id = this.projectId++;
      const now = new Date();
      
      const newProject: Project = {
        ...project,
        id,
        createdAt: now,
        updatedAt: now,
      };
      
      this.projects.set(id, newProject);
      createdProjects.push(newProject);
    });
    
    // Create demo models
    // First, helper to create nodes and edges
    const createWaterManagementModel = (): { nodes: FCMNode[], edges: FCMEdge[] } => {
      const nodes: FCMNode[] = [
        {
          id: 'node-1',
          label: 'groundwater level',
          type: 'driver',
          value: 0.8,
          positionX: 250,
          positionY: 100,
          color: '#00C4FF',
        },
        {
          id: 'node-2',
          label: 'precipitation',
          type: 'driver',
          value: 0.6,
          positionX: 100,
          positionY: 200,
          color: '#00C4FF',
        },
        {
          id: 'node-3',
          label: 'agricultural demand',
          type: 'regular',
          value: 0.4,
          positionX: 150,
          positionY: 350,
          color: '#A855F7',
        },
        {
          id: 'node-4',
          label: 'water quality',
          type: 'outcome',
          value: 0.2,
          positionX: 400,
          positionY: 250,
          color: '#A855F7',
        },
        {
          id: 'node-5',
          label: 'ecosystem health',
          type: 'outcome',
          value: 0.5,
          positionX: 350,
          positionY: 400,
          color: '#00C4FF',
        },
      ];
      
      const edges: FCMEdge[] = [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-4',
          weight: 0.8,
        },
        {
          id: 'edge-2',
          source: 'node-2',
          target: 'node-1',
          weight: 0.6,
        },
        {
          id: 'edge-3',
          source: 'node-3',
          target: 'node-1',
          weight: -0.5,
        },
        {
          id: 'edge-4',
          source: 'node-1',
          target: 'node-5',
          weight: 0.7,
        },
        {
          id: 'edge-5',
          source: 'node-4',
          target: 'node-5',
          weight: 0.9,
        },
      ];
      
      return { nodes, edges };
    };
    
    // Create models for each project
    const models = [
      {
        name: 'River Basin Model',
        description: 'Model of river basin dynamics',
        projectId: createdProjects[0].id,
        nodes: [] as FCMNode[],
        edges: [] as FCMEdge[],
      },
      {
        name: 'Groundwater Impacts',
        description: 'Model of groundwater system impacts',
        projectId: createdProjects[1].id,
        ...createWaterManagementModel(),
      },
      {
        name: 'Policy Feedback',
        description: 'Model of policy feedback loops',
        projectId: createdProjects[2].id,
        nodes: [] as FCMNode[],
        edges: [] as FCMEdge[],
      },
    ];
    
    models.forEach(model => {
      const id = this.modelId++;
      const now = new Date();
      
      const newModel: Model = {
        ...model,
        id,
        createdAt: now,
        updatedAt: now,
      };
      
      this.models.set(id, newModel);
    });
  }
}

// Use PostgresStorage if DATABASE_URL is available, otherwise use MemStorage
const usePostgres = !!process.env.DATABASE_URL;
export const storage = usePostgres ? new PostgresStorage() : new MemStorage();

console.log(`Using ${usePostgres ? 'PostgreSQL' : 'in-memory'} storage for MettaModeler`);
