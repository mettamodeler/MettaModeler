import { 
  User, InsertUser, 
  Project, InsertProject, 
  Model, InsertModel, 
  Scenario, InsertScenario,
  FCMNode,
  FCMEdge,
  users,
  projects,
  models,
  scenarios
} from "@shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from 'drizzle-orm';

export interface IStorage {
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
  updateModel(id: number, model: Partial<Model>): Promise<Model | undefined>;
  deleteModel(id: number): Promise<boolean>;
  
  // Scenario operations
  getScenarios(): Promise<Scenario[]>;
  getScenariosByModel(modelId: number): Promise<Scenario[]>;
  getScenario(id: number): Promise<Scenario | undefined>;
  createScenario(scenario: InsertScenario): Promise<Scenario>;
  deleteScenario(id: number): Promise<boolean>;
}

export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  
  constructor() {
    // Create a PostgreSQL connection
    const queryClient = postgres(process.env.DATABASE_URL || "");
    this.db = drizzle(queryClient);
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
    const result = await this.db.insert(models).values(insertModel).returning();
    return result[0];
  }
  
  async updateModel(id: number, updates: Partial<Model>): Promise<Model | undefined> {
    const result = await this.db.update(models)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(models.id, id))
      .returning();
    return result[0];
  }
  
  async deleteModel(id: number): Promise<boolean> {
    try {
      const result = await this.db.delete(models).where(eq(models.id, id)).returning({ id: models.id });
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting model:", error);
      return false;
    }
  }
  
  // SCENARIO OPERATIONS
  async getScenarios(): Promise<Scenario[]> {
    return await this.db.select().from(scenarios);
  }
  
  async getScenariosByModel(modelId: number): Promise<Scenario[]> {
    return await this.db.select().from(scenarios).where(eq(scenarios.modelId, modelId));
  }
  
  async getScenario(id: number): Promise<Scenario | undefined> {
    const result = await this.db.select().from(scenarios).where(eq(scenarios.id, id));
    return result[0];
  }
  
  async createScenario(insertScenario: InsertScenario): Promise<Scenario> {
    const result = await this.db.insert(scenarios).values(insertScenario).returning();
    return result[0];
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

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.models = new Map();
    this.scenarios = new Map();
    
    this.userId = 1;
    this.projectId = 1;
    this.modelId = 1;
    this.scenarioId = 1;
    
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
      ...insertProject, 
      id,
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
    
    const model: Model = { 
      ...insertModel, 
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.models.set(id, model);
    return model;
  }
  
  async updateModel(id: number, updates: Partial<Model>): Promise<Model | undefined> {
    const model = this.models.get(id);
    if (!model) return undefined;
    
    const updatedModel = { 
      ...model, 
      ...updates,
      updatedAt: new Date(),
    };
    
    this.models.set(id, updatedModel);
    return updatedModel;
  }
  
  async deleteModel(id: number): Promise<boolean> {
    return this.models.delete(id);
  }
  
  // SCENARIO OPERATIONS
  async getScenarios(): Promise<Scenario[]> {
    return Array.from(this.scenarios.values());
  }
  
  async getScenariosByModel(modelId: number): Promise<Scenario[]> {
    return Array.from(this.scenarios.values())
      .filter(scenario => scenario.modelId === modelId);
  }
  
  async getScenario(id: number): Promise<Scenario | undefined> {
    return this.scenarios.get(id);
  }
  
  async createScenario(insertScenario: InsertScenario): Promise<Scenario> {
    const id = this.scenarioId++;
    const now = new Date();
    
    const scenario: Scenario = { 
      ...insertScenario, 
      id,
      createdAt: now,
    };
    
    this.scenarios.set(id, scenario);
    return scenario;
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
