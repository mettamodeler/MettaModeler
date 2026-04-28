import express from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

type RegisterRoutes = (app: express.Express) => Promise<import("http").Server>;

const strongPassword = "Str0ng!Passw0rd";

const registerUser = async (agent: request.SuperAgentTest, username: string, email: string) => {
  const response = await agent.post("/api/register").send({
    username,
    email,
    password: strongPassword,
    displayName: username,
  });
  expect(response.status).toBe(201);
  return response;
};

const loginUser = async (agent: request.SuperAgentTest, username: string) => {
  const response = await agent.post("/api/login").send({
    username,
    password: strongPassword,
  });
  expect(response.status).toBe(200);
  return response;
};

const createProject = async (agent: request.SuperAgentTest, name: string) => {
  const response = await agent.post("/api/projects").send({
    name,
    description: `${name} description`,
  });
  expect(response.status).toBe(201);
  expect(response.body?.id).toBeDefined();
  return response.body;
};

const createModel = async (agent: request.SuperAgentTest, projectId: number, name: string) => {
  const response = await agent.post("/api/models").send({
    name,
    description: `${name} description`,
    projectId,
    nodes: [],
    edges: [],
  });
  expect(response.status).toBe(201);
  expect(response.body?.id).toBeDefined();
  return response.body;
};

const createScenario = async (agent: request.SuperAgentTest, modelId: number, name: string) => {
  const response = await agent.post("/api/scenarios").send({
    name,
    modelId,
    description: `${name} description`,
    nodes: [],
    initialValues: {},
    clampedNodes: [],
    simulationParams: {
      activation: "sigmoid",
      threshold: 0.001,
      maxIterations: 1,
    },
    results: {
      finalState: {},
      timeSeries: {},
      iterations: 0,
      converged: true,
      initialValues: {},
    },
  });
  expect(response.status).toBe(201);
  expect(response.body?.id).toBeDefined();
  return response.body;
};

describe("ownership access control", () => {
  let registerRoutes: RegisterRoutes;
  let app: express.Express;

  beforeAll(async () => {
    ({ registerRoutes } = await import("../routes"));
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(app);
  });

  it("scopes projects, models, and scenarios to the authenticated user", async () => {
    const alice = request.agent(app);
    const bob = request.agent(app);

    await registerUser(alice, "alice", "alice@example.com");
    await registerUser(bob, "bob", "bob@example.com");

    await loginUser(alice, "alice");
    await loginUser(bob, "bob");

    const aliceProject = await createProject(alice, "Alice Project");
    const bobProject = await createProject(bob, "Bob Project");

    const aliceModel = await createModel(alice, aliceProject.id, "Alice Model");
    const bobModel = await createModel(bob, bobProject.id, "Bob Model");

    await createScenario(alice, aliceModel.id, "Alice Scenario");
    await createScenario(bob, bobModel.id, "Bob Scenario");

    const aliceProjects = await alice.get("/api/projects");
    expect(aliceProjects.status).toBe(200);
    expect(aliceProjects.body).toHaveLength(1);
    expect(aliceProjects.body[0].id).toBe(aliceProject.id);

    const aliceModels = await alice.get("/api/models");
    expect(aliceModels.status).toBe(200);
    expect(aliceModels.body).toHaveLength(1);
    expect(aliceModels.body[0].id).toBe(aliceModel.id);

    const aliceScenarios = await alice.get("/api/scenarios");
    expect(aliceScenarios.status).toBe(200);
    expect(aliceScenarios.body).toHaveLength(1);
    expect(aliceScenarios.body[0].modelId).toBe(aliceModel.id);
  });

  it("blocks access to another user's resources", async () => {
    const owner = request.agent(app);
    const other = request.agent(app);

    await registerUser(owner, "owner", "owner@example.com");
    await registerUser(other, "other", "other@example.com");
    await loginUser(owner, "owner");
    await loginUser(other, "other");

    const ownerProject = await createProject(owner, "Owner Project");
    const ownerModel = await createModel(owner, ownerProject.id, "Owner Model");
    const ownerScenario = await createScenario(owner, ownerModel.id, "Owner Scenario");

    const projectResponse = await other.get(`/api/projects/${ownerProject.id}`);
    expect(projectResponse.status).toBe(403);

    const projectModels = await other.get(`/api/projects/${ownerProject.id}/models`);
    expect(projectModels.status).toBe(403);

    const modelResponse = await other.get(`/api/models/${ownerModel.id}`);
    expect(modelResponse.status).toBe(404);

    const scenarioResponse = await other.get(`/api/scenarios/${ownerScenario.id}`);
    expect(scenarioResponse.status).toBe(404);
  });

  it("prevents creating models or scenarios under another user's ownership", async () => {
    const owner = request.agent(app);
    const other = request.agent(app);

    await registerUser(owner, "creator", "creator@example.com");
    await registerUser(other, "intruder", "intruder@example.com");
    await loginUser(owner, "creator");
    await loginUser(other, "intruder");

    const ownerProject = await createProject(owner, "Owner Project");
    const ownerModel = await createModel(owner, ownerProject.id, "Owner Model");

    const modelResponse = await other.post("/api/models").send({
      name: "Intruder Model",
      description: "Should fail",
      projectId: ownerProject.id,
      nodes: [],
      edges: [],
    });
    expect(modelResponse.status).toBe(403);

    const scenarioResponse = await other.post("/api/scenarios").send({
      name: "Intruder Scenario",
      modelId: ownerModel.id,
      description: "Should fail",
      nodes: [],
      initialValues: {},
      clampedNodes: [],
    });
    expect(scenarioResponse.status).toBe(404);
  });
});
