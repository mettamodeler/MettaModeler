import { 
  User, InsertUser, DrizzleUser,
  Project, InsertProject, DrizzleProject,
  Model, InsertModel, DrizzleModel,
  Scenario, InsertScenario, DrizzleScenario,
  users,
  projects,
  models,
  scenarios
} from "@shared/schema";
import {
  FCMNode,
  FCMEdge,
  SimulationResult,
  SimulationParameters,
  SimulationNode
} from "@shared/generated";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from 'drizzle-orm';
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import pg from "pg";
import { db } from "./db";
import { toCamelScenario } from './utils/caseMapping';
const { Pool } = pg;

export interface CreateModelData {
  name: string;
  description?: string | null;
  projectId?: number | null;
  nodes: FCMNode[];
  edges: FCMEdge[];
}

export interface CreateScenarioData {
  name: string;
  modelId: number;
  description?: string | null;
  nodes: SimulationNode[];
  initialValues: Record<string, number>;
  results?: SimulationResult;
  simulationParams?: SimulationParameters;
  clampedNodes?: string[];
}

export interface IStorage {
  // Session storage
  sessionStore: any; // Using any to avoid complex typings with express-session

  // User operations
  // Note: User type is now from generated types, but database returns DrizzleUser
  // They're compatible, but we use DrizzleUser for internal type safety
  getUser(id: number): Promise<DrizzleUser | undefined>;
  getUserByUsername(username: string): Promise<DrizzleUser | undefined>;
  getUserByEmail(email: string): Promise<DrizzleUser | undefined>;
  getUserByVerificationToken(token: string): Promise<DrizzleUser | undefined>;
  getUserByPasswordResetToken(token: string): Promise<DrizzleUser | undefined>;
  createUser(user: InsertUser): Promise<DrizzleUser>;
  updateUser(id: number, updates: Partial<DrizzleUser>): Promise<DrizzleUser | undefined>;
  
  // Project operations
  // Note: Project type is now from generated types, but database returns DrizzleProject
  getProjects(): Promise<DrizzleProject[]>;
  getProjectsByUser(userId: number): Promise<DrizzleProject[]>;
  getProject(id: number): Promise<DrizzleProject | undefined>;
  createProject(project: InsertProject): Promise<DrizzleProject>;
  updateProject(id: number, project: Partial<DrizzleProject>): Promise<DrizzleProject | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Model operations
  // Note: Model type is now from generated types, but database returns DrizzleModel
  getModels(): Promise<DrizzleModel[]>;
  getModelsByUser(userId: number): Promise<DrizzleModel[]>;
  getModelsByProject(projectId: number): Promise<DrizzleModel[]>;
  getModel(id: number): Promise<DrizzleModel | null>;
  createModel(data: CreateModelData): Promise<DrizzleModel>;
  updateModel(id: number, data: Partial<DrizzleModel>): Promise<DrizzleModel>;
  deleteModel(id: number): Promise<boolean>;
  
  // Scenario operations
  // Note: Scenario type is now from generated types, but database returns DrizzleScenario
  getScenarios(): Promise<DrizzleScenario[]>;
  getScenariosByUser(userId: number): Promise<DrizzleScenario[]>;
  getScenariosByModel(modelId: number): Promise<DrizzleScenario[]>;
  getScenario(id: number): Promise<DrizzleScenario | null>;
  createScenario(data: CreateScenarioData): Promise<DrizzleScenario>;
  updateScenario(id: number, data: Partial<DrizzleScenario>): Promise<DrizzleScenario>;
  deleteScenario(id: number): Promise<boolean>;
}

export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  sessionStore: any;
  
  constructor(db: ReturnType<typeof drizzle>) {
    this.db = db;
    
    // Create PostgreSQL session store
    const PostgresSessionStore = connectPg(session);
    const pgPool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    this.sessionStore = new PostgresSessionStore({ 
      pool: pgPool, 
      tableName: 'user_sessions', 
      createTableIfMissing: true 
    });
  }

  // USER OPERATIONS
  async getUser(id: number): Promise<DrizzleUser | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<DrizzleUser | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<DrizzleUser | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserByVerificationToken(token: string): Promise<DrizzleUser | undefined> {
    const result = await this.db.select().from(users).where(eq(users.emailVerificationToken, token));
    return result[0];
  }

  async getUserByPasswordResetToken(token: string): Promise<DrizzleUser | undefined> {
    const result = await this.db.select().from(users).where(eq(users.passwordResetToken, token));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<DrizzleUser> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: number, updates: Partial<DrizzleUser>): Promise<DrizzleUser | undefined> {
    const result = await this.db.update(users)
      .set({ ...updates })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }
  
  // PROJECT OPERATIONS
  async getProjects(): Promise<DrizzleProject[]> {
    return await this.db.select().from(projects);
  }

  async getProjectsByUser(userId: number): Promise<DrizzleProject[]> {
    return await this.db.select().from(projects).where(eq(projects.userId, userId));
  }
  
  async getProject(id: number): Promise<DrizzleProject | undefined> {
    const result = await this.db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }
  
  async createProject(insertProject: InsertProject): Promise<DrizzleProject> {
    const result = await this.db.insert(projects).values(insertProject).returning();
    return result[0];
  }
  
  async updateProject(id: number, updates: Partial<DrizzleProject>): Promise<DrizzleProject | undefined> {
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
  async getModels(): Promise<DrizzleModel[]> {
    const results = await this.db.select().from(models);
    return results;
  }

  async getModelsByUser(userId: number): Promise<DrizzleModel[]> {
    const results = await this.db
      .select({ model: models })
      .from(models)
      .innerJoin(projects, eq(models.projectId, projects.id))
      .where(eq(projects.userId, userId));
    return results.map(result => result.model);
  }
  
  async getModelsByProject(projectId: number): Promise<DrizzleModel[]> {
    const results = await this.db.select().from(models).where(eq(models.projectId, projectId));
    return results;
  }
  
  async getModel(id: number): Promise<DrizzleModel | null> {
    const result = await this.db.select().from(models).where(eq(models.id, id));
    return result[0] || null;
  }
  
  async createModel(data: CreateModelData): Promise<DrizzleModel> {
    const [model] = await this.db.insert(models).values({
      name: data.name,
      description: data.description,
      projectId: data.projectId,
      nodes: data.nodes,
      edges: data.edges,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return model;
  }
  
  async updateModel(id: number, data: Partial<DrizzleModel>): Promise<DrizzleModel> {
    const [model] = await this.db.update(models)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(models.id, id))
      .returning();
    if (!model) throw new Error('Model not found');
    return model;
  }
  
  async deleteModel(id: number): Promise<boolean> {
    const result = await this.db.delete(models).where(eq(models.id, id)).returning({ id: models.id });
    return result.length > 0;
  }
  
  // SCENARIO OPERATIONS
  async getScenarios(): Promise<DrizzleScenario[]> {
    const results = await this.db.select().from(scenarios);
    return results.map(toCamelScenario) as DrizzleScenario[];
  }

  async getScenariosByUser(userId: number): Promise<DrizzleScenario[]> {
    const results = await this.db
      .select({ scenario: scenarios })
      .from(scenarios)
      .innerJoin(models, eq(scenarios.modelId, models.id))
      .innerJoin(projects, eq(models.projectId, projects.id))
      .where(eq(projects.userId, userId));
    return results.map(result => toCamelScenario(result.scenario)) as DrizzleScenario[];
  }
  
  async getScenariosByModel(modelId: number): Promise<DrizzleScenario[]> {
    const results = await this.db.select().from(scenarios).where(eq(scenarios.modelId, modelId));
    return results.map(toCamelScenario) as DrizzleScenario[];
  }
  
  async getScenario(id: number): Promise<DrizzleScenario | null> {
    const result = await this.db.select().from(scenarios).where(eq(scenarios.id, id));
    if (!result[0]) return null;
    return toCamelScenario(result[0]) as DrizzleScenario;
  }
  
  async createScenario(data: CreateScenarioData): Promise<DrizzleScenario> {
    const now = new Date();
    console.log("createScenario received clampedNodes:", JSON.stringify(data.clampedNodes));
    const [scenario] = await this.db.insert(scenarios).values({
      name: data.name,
      modelId: data.modelId,
      description: data.description,
      nodes: data.nodes,
      initialValues: data.initialValues,
      results: data.results,
      simulationParams: data.simulationParams,
      clampedNodes: Array.isArray(data.clampedNodes) ? data.clampedNodes : [],
      createdAt: now,
      updatedAt: now
    }).returning({
      id: scenarios.id,
      name: scenarios.name,
      modelId: scenarios.modelId,
      description: scenarios.description,
      nodes: scenarios.nodes,
      initialValues: scenarios.initialValues,
      results: scenarios.results,
      simulationParams: scenarios.simulationParams,
      clampedNodes: scenarios.clampedNodes,
      createdAt: scenarios.createdAt,
      updatedAt: scenarios.updatedAt,
    });
    return toCamelScenario(scenario);
  }
  
  async updateScenario(id: number, data: Partial<DrizzleScenario>): Promise<DrizzleScenario> {
    const [scenario] = await this.db.update(scenarios)
      .set({
        ...data,
        clampedNodes: data.clampedNodes || [],
        updatedAt: new Date()
      })
      .where(eq(scenarios.id, id))
      .returning({
        id: scenarios.id,
        name: scenarios.name,
        modelId: scenarios.modelId,
        description: scenarios.description,
        nodes: scenarios.nodes,
        initialValues: scenarios.initialValues,
        results: scenarios.results,
        simulationParams: scenarios.simulationParams,
        clampedNodes: scenarios.clampedNodes,
        createdAt: scenarios.createdAt,
        updatedAt: scenarios.updatedAt,
      });
    if (!scenario) throw new Error('Scenario not found');
    return toCamelScenario(scenario) as DrizzleScenario;
  }
  
  async deleteScenario(id: number): Promise<boolean> {
    const result = await this.db.delete(scenarios).where(eq(scenarios.id, id)).returning({ id: scenarios.id });
    return result.length > 0;
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, DrizzleUser>;
  private projects: Map<number, DrizzleProject>;
  private models: Map<number, DrizzleModel>;
  private scenarios: Map<number, DrizzleScenario>;
  
  private userId: number;
  private projectId: number;
  private modelId: number;
  private scenarioId: number;
  sessionStore: any;

  constructor(initializeDemoData: boolean = false) {
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
    
    if (initializeDemoData) {
      this.initializeDemoData();
    }
  }

  // USER OPERATIONS
  async getUser(id: number): Promise<DrizzleUser | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<DrizzleUser | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<DrizzleUser | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByVerificationToken(token: string): Promise<DrizzleUser | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.emailVerificationToken === token,
    );
  }

  async getUserByPasswordResetToken(token: string): Promise<DrizzleUser | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.passwordResetToken === token,
    );
  }

  async createUser(insertUser: InsertUser): Promise<DrizzleUser> {
    const id = this.userId++;
    const user: DrizzleUser = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      displayName: insertUser.displayName || null,
      role: insertUser.role || null,
      email: (insertUser as DrizzleUser).email ?? null,
      emailVerified: (insertUser as DrizzleUser).emailVerified ?? null,
      emailVerificationToken: (insertUser as DrizzleUser).emailVerificationToken ?? null,
      emailVerificationExpires: (insertUser as DrizzleUser).emailVerificationExpires ?? null,
      failedLoginAttempts: (insertUser as DrizzleUser).failedLoginAttempts ?? null,
      lockedUntil: (insertUser as DrizzleUser).lockedUntil ?? null,
      passwordResetToken: (insertUser as DrizzleUser).passwordResetToken ?? null,
      passwordResetExpires: (insertUser as DrizzleUser).passwordResetExpires ?? null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<DrizzleUser>): Promise<DrizzleUser | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // PROJECT OPERATIONS
  async getProjects(): Promise<DrizzleProject[]> {
    return Array.from(this.projects.values());
  }

  async getProjectsByUser(userId: number): Promise<DrizzleProject[]> {
    return Array.from(this.projects.values()).filter(project => project.userId === userId);
  }
  
  async getProject(id: number): Promise<DrizzleProject | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(insertProject: InsertProject): Promise<DrizzleProject> {
    const id = this.projectId++;
    const now = new Date();
    
    const project: DrizzleProject = { 
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
  
  async updateProject(id: number, updates: Partial<DrizzleProject>): Promise<DrizzleProject | undefined> {
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
  async getModels(): Promise<DrizzleModel[]> {
    return Array.from(this.models.values());
  }

  async getModelsByUser(userId: number): Promise<DrizzleModel[]> {
    const userProjectIds = new Set(
      Array.from(this.projects.values())
        .filter(project => project.userId === userId)
        .map(project => project.id)
    );

    return Array.from(this.models.values())
      .filter(model => model.projectId && userProjectIds.has(model.projectId));
  }
  
  async getModelsByProject(projectId: number): Promise<DrizzleModel[]> {
    return Array.from(this.models.values())
      .filter(model => model.projectId === projectId);
  }
  
  async getModel(id: number): Promise<DrizzleModel | null> {
    const model = this.models.get(id);
    return model || null;
  }
  
  async createModel(data: CreateModelData): Promise<DrizzleModel> {
    const id = this.modelId++;
    const now = new Date();
    
    // Type assertions to help TypeScript
    const typedNodes = data.nodes ? (data.nodes as unknown as FCMNode[]) : [];
    const typedEdges = data.edges ? (data.edges as unknown as FCMEdge[]) : [];
    
    const model: DrizzleModel = { 
      id,
      name: data.name,
      description: data.description || null,
      projectId: data.projectId || null,
      nodes: typedNodes,
      edges: typedEdges,
      createdAt: now,
      updatedAt: now,
    };
    
    this.models.set(id, model);
    return model;
  }
  
  async updateModel(id: number, data: Partial<DrizzleModel>): Promise<DrizzleModel> {
    const model = this.models.get(id);
    if (!model) throw new Error('Model not found');
    
    const updatedModel = { 
      ...model, 
      ...data,
      updatedAt: new Date()
    };
    
    this.models.set(id, updatedModel);
    return updatedModel;
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
  async getScenarios(): Promise<DrizzleScenario[]> {
    return Array.from(this.scenarios.values()).map(s => ({
      ...s,
      clampedNodes: Array.isArray(s.clampedNodes) ? s.clampedNodes : [],
      simulationParams: s.simulationParams ?? null,
    })) as DrizzleScenario[];
  }

  async getScenariosByUser(userId: number): Promise<DrizzleScenario[]> {
    const userProjectIds = new Set(
      Array.from(this.projects.values())
        .filter(project => project.userId === userId)
        .map(project => project.id)
    );

    const userModelIds = new Set(
      Array.from(this.models.values())
        .filter(model => model.projectId && userProjectIds.has(model.projectId))
        .map(model => model.id)
    );

    return Array.from(this.scenarios.values())
      .filter(scenario => scenario.modelId !== null && userModelIds.has(scenario.modelId))
      .map(s => ({
        ...s,
        clampedNodes: Array.isArray(s.clampedNodes) ? s.clampedNodes : [],
        simulationParams: s.simulationParams ?? null,
      })) as DrizzleScenario[];
  }
  
  async getScenariosByModel(modelId: number): Promise<DrizzleScenario[]> {
    return Array.from(this.scenarios.values())
      .filter(scenario => scenario.modelId === modelId)
      .map(s => ({
        ...s,
        clampedNodes: Array.isArray(s.clampedNodes) ? s.clampedNodes : [],
        simulationParams: s.simulationParams ?? null,
      })) as DrizzleScenario[];
  }
  
  async getScenario(id: number): Promise<DrizzleScenario | null> {
    const s = this.scenarios.get(id);
    if (!s) return null;
    return { ...s, clampedNodes: Array.isArray(s.clampedNodes) ? s.clampedNodes : [], simulationParams: s.simulationParams ?? null } as DrizzleScenario;
  }
  
  async createScenario(data: CreateScenarioData): Promise<DrizzleScenario> {
    const id = this.scenarioId++;
    const now = new Date();
    
    const scenario: DrizzleScenario = {
      id,
      name: data.name,
      modelId: data.modelId,
      description: data.description || null,
      nodes: data.nodes,
      initialValues: data.initialValues,
      results: data.results || null,
      simulationParams: data.simulationParams || null,
      clampedNodes: data.clampedNodes || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.scenarios.set(id, scenario);
    return toCamelScenario(scenario) as DrizzleScenario;
  }
  
  async updateScenario(id: number, data: Partial<DrizzleScenario>): Promise<DrizzleScenario> {
    const scenario = this.scenarios.get(id);
    if (!scenario) throw new Error('Scenario not found');
    
    const updatedScenario = {
      ...scenario,
      ...data,
      updatedAt: new Date()
    };
    
    this.scenarios.set(id, updatedScenario);
    return toCamelScenario(updatedScenario) as DrizzleScenario;
  }
  
  async deleteScenario(id: number): Promise<boolean> {
    return this.scenarios.delete(id);
  }
  
  // Demo data initialization
  private initializeDemoData() {
    // Create demo user
    const demoUser: DrizzleUser = {
      id: this.userId++,
      username: 'emma.wilson',
      password: 'password123', // not secure, just for demo
      displayName: 'Emma Wilson',
      role: 'researcher',
      email: null,
      emailVerified: null,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordResetToken: null,
      passwordResetExpires: null,
    };
    const demoUserId = Number(demoUser.id);
    this.users.set(demoUserId, demoUser);
    
    // Create demo projects
    const projects = [
      {
        name: 'Climate Adaptation',
        description: 'Models for climate adaptation strategies',
        userId: demoUserId,
      },
      {
        name: 'Water Management',
        description: 'Hydrological system models',
        userId: demoUserId,
      },
      {
        name: 'Social Networks',
        description: 'Social network influence models',
        userId: demoUserId,
      },
    ];
    
    const createdProjects: DrizzleProject[] = [];
    
    projects.forEach(project => {
      const id = this.projectId++;
      const now = new Date();
      
      const newProject: DrizzleProject = {
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
      
      const newModel: DrizzleModel = {
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
export const storage = usePostgres ? new PostgresStorage(db as any) : new MemStorage(false);

console.log(`Using ${usePostgres ? 'PostgreSQL' : 'in-memory'} storage for MettaModeler`);
