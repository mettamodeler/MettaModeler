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
    expect(scenarioResponse.status).toBe(403);
  });

  it("does not mutate model graph when scenarios are created or updated", async () => {
    const owner = request.agent(app);
    await registerUser(owner, "graph-owner", "graph-owner@example.com");
    await loginUser(owner, "graph-owner");

    const project = await createProject(owner, "Graph Stability Project");
    const modelResponse = await owner.post("/api/models").send({
      name: "Stable Model",
      description: "Model used for scenario regression",
      projectId: project.id,
      nodes: [
        { id: "n1", label: "Node 1", type: "regular", value: 0.5, positionX: 0, positionY: 0, color: "#000000" },
        { id: "n2", label: "Node 2", type: "regular", value: 0.4, positionX: 100, positionY: 100, color: "#000000" },
      ],
      edges: [{ id: "e1", source: "n1", target: "n2", weight: 0.8 }],
    });
    expect(modelResponse.status).toBe(201);
    const modelId = modelResponse.body.id;

    const initialModel = await owner.get(`/api/models/${modelId}`);
    expect(initialModel.status).toBe(200);
    expect(initialModel.body.nodes).toHaveLength(2);
    expect(initialModel.body.edges).toHaveLength(1);

    const scenario = await createScenario(owner, modelId, "Graph Scenario");
    const patchResponse = await owner.patch(`/api/scenarios/${scenario.id}`).send({
      description: "Updated scenario metadata",
    });
    expect(patchResponse.status).toBe(200);

    const modelAfterScenario = await owner.get(`/api/models/${modelId}`);
    expect(modelAfterScenario.status).toBe(200);
    expect(modelAfterScenario.body.nodes).toHaveLength(2);
    expect(modelAfterScenario.body.edges).toHaveLength(1);
    expect(modelAfterScenario.body.nodes.map((node: any) => node.id)).toEqual(["n1", "n2"]);
    expect(modelAfterScenario.body.edges.map((edge: any) => edge.id)).toEqual(["e1"]);
  });

  it("preserves clampedNodes when patching scenario results only", async () => {
    const owner = request.agent(app);
    await registerUser(owner, "clamp-owner", "clamp-owner@example.com");
    await loginUser(owner, "clamp-owner");

    const project = await createProject(owner, "Clamp Persistence Project");
    const model = await owner.post("/api/models").send({
      name: "Clamp Model",
      description: "Model for clamped node persistence",
      projectId: project.id,
      nodes: [
        { id: "n1", label: "Node 1", type: "regular", value: 0.5, positionX: 0, positionY: 0, color: "#000000" },
      ],
      edges: [],
    });
    expect(model.status).toBe(201);

    const scenario = await owner.post("/api/scenarios").send({
      name: "Clamp Scenario",
      modelId: model.body.id,
      description: "",
      nodes: [{ id: "n1", label: "Node 1", value: 0.8 }],
      initialValues: { n1: 0.8 },
      clampedNodes: ["n1"],
      simulationParams: { activation: "sigmoid", threshold: 0.001, maxIterations: 20 },
      results: {
        finalState: { n1: { id: "n1", label: "Node 1", value: 0.8 } },
        timeSeries: { n1: [0.8, 0.8] },
        iterations: 1,
        converged: true,
        initialValues: { n1: 0.8 },
      },
    });
    expect(scenario.status).toBe(201);

    const patchResponse = await owner.patch(`/api/scenarios/${scenario.body.id}`).send({
      results: {
        finalState: { n1: { id: "n1", label: "Node 1", value: 0.7 } },
        timeSeries: { n1: [0.8, 0.7] },
        iterations: 2,
        converged: true,
        initialValues: { n1: 0.8 },
      },
    });
    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.clampedNodes).toEqual(["n1"]);
  });

  it("allows invited editors to edit project models and blocks outsiders", async () => {
    const owner = request.agent(app);
    const editor = request.agent(app);
    const outsider = request.agent(app);

    await registerUser(owner, "owner-edit", "owner-edit@example.com");
    await registerUser(editor, "editor-edit", "editor-edit@example.com");
    await registerUser(outsider, "outsider-edit", "outsider-edit@example.com");

    await loginUser(owner, "owner-edit");
    await loginUser(editor, "editor-edit");
    await loginUser(outsider, "outsider-edit");

    const project = await createProject(owner, "Collaborative Project");
    const model = await createModel(owner, project.id, "Shared Model");

    const inviteResponse = await owner.post(`/api/projects/${project.id}/members`).send({
      username: "editor-edit",
    });
    expect(inviteResponse.status).toBe(201);

    const editorCreateModel = await editor.post("/api/models").send({
      name: "Editor Added Model",
      description: "Created by editor",
      projectId: project.id,
      nodes: [],
      edges: [],
    });
    expect(editorCreateModel.status).toBe(201);

    const editorUpdate = await editor.put(`/api/models/${model.id}`).send({
      name: "Editor Updated Name",
    });
    expect(editorUpdate.status).toBe(200);

    const outsiderCreateModel = await outsider.post("/api/models").send({
      name: "Should fail",
      description: "No access",
      projectId: project.id,
      nodes: [],
      edges: [],
    });
    expect(outsiderCreateModel.status).toBe(403);
  });

  it("imports model JSON into owned project", async () => {
    const owner = request.agent(app);
    await registerUser(owner, "import-owner", "import-owner@example.com");
    await loginUser(owner, "import-owner");

    const project = await createProject(owner, "Import Project");
    const importResponse = await owner.post(`/api/projects/${project.id}/models/import`).send({
      model: {
        name: "Imported Climate Model",
        description: "from json",
        nodes: [{ id: "a", label: "A", type: "regular", value: 0.2, positionX: 10, positionY: 10, color: "#111111" }],
        edges: [],
      },
    });
    expect(importResponse.status).toBe(201);
    expect(importResponse.body.name).toBe("Imported Climate Model");
  });

  it("serves public read-only model by slug when enabled", async () => {
    const owner = request.agent(app);
    await registerUser(owner, "public-owner", "public-owner@example.com");
    await loginUser(owner, "public-owner");

    const project = await createProject(owner, "Public Project");
    const model = await createModel(owner, project.id, "Public Model");
    const enablePublic = await owner.patch(`/api/models/${model.id}/public`).send({
      isPublic: true,
      publicSlug: "public-model-check",
    });
    expect(enablePublic.status).toBe(200);

    const publicResponse = await request(app).get("/api/public/models/public-model-check");
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.body.name).toBe("Public Model");
  });

  it("returns fuzzy mapping suggestions for near-matching node labels", async () => {
    const owner = request.agent(app);
    await registerUser(owner, "fuzzy-owner", "fuzzy-owner@example.com");
    await loginUser(owner, "fuzzy-owner");

    const project = await createProject(owner, "Fuzzy Mapping Project");
    const modelA = await owner.post("/api/models").send({
      name: "Model A",
      description: "",
      projectId: project.id,
      nodes: [{ id: "n1", label: "Water Quality", type: "regular", value: 0.4, positionX: 0, positionY: 0, color: "#000000" }],
      edges: [],
    });
    expect(modelA.status).toBe(201);
    const modelB = await owner.post("/api/models").send({
      name: "Model B",
      description: "",
      projectId: project.id,
      nodes: [{ id: "n2", label: "Water Quality Index", type: "regular", value: 0.5, positionX: 0, positionY: 0, color: "#000000" }],
      edges: [],
    });
    expect(modelB.status).toBe(201);

    const suggestions = await owner.get(`/api/projects/${project.id}/mapping-suggestions?modelIds=${modelA.body.id},${modelB.body.id}`);
    expect(suggestions.status).toBe(200);
    expect(Array.isArray(suggestions.body.suggestions)).toBe(true);
    expect(suggestions.body.suggestions.length).toBeGreaterThan(0);
    const fuzzyOrExact = suggestions.body.suggestions.find((s: any) =>
      Array.isArray(s.members) &&
      s.members.some((m: any) => m.modelId === modelA.body.id) &&
      s.members.some((m: any) => m.modelId === modelB.body.id)
    );
    expect(fuzzyOrExact).toBeDefined();
    expect(typeof fuzzyOrExact.score).toBe("number");
    expect(["exact", "fuzzy"]).toContain(fuzzyOrExact.matchType);
  });

  it("supports mean and median edge aggregation with conflict metadata", async () => {
    const owner = request.agent(app);
    await registerUser(owner, "agg-owner", "agg-owner@example.com");
    await loginUser(owner, "agg-owner");

    const project = await createProject(owner, "Aggregation Project");
    const model1 = await owner.post("/api/models").send({
      name: "Aggregator 1",
      description: "",
      projectId: project.id,
      nodes: [
        { id: "a1", label: "Demand", type: "regular", value: 0.3, positionX: 0, positionY: 0, color: "#000000" },
        { id: "b1", label: "Supply", type: "regular", value: 0.2, positionX: 0, positionY: 0, color: "#000000" },
      ],
      edges: [{ id: "e1", source: "a1", target: "b1", weight: 1.0 }],
    });
    expect(model1.status).toBe(201);

    const model2 = await owner.post("/api/models").send({
      name: "Aggregator 2",
      description: "",
      projectId: project.id,
      nodes: [
        { id: "a2", label: "Demand", type: "regular", value: 0.6, positionX: 0, positionY: 0, color: "#000000" },
        { id: "b2", label: "Supply", type: "regular", value: 0.4, positionX: 0, positionY: 0, color: "#000000" },
      ],
      edges: [{ id: "e2", source: "a2", target: "b2", weight: -1.0 }],
    });
    expect(model2.status).toBe(201);

    await owner.post(`/api/projects/${project.id}/mappings`).send({
      canonicalNodeKey: "demand",
      canonicalNodeLabel: "Demand",
      sourceModelId: model1.body.id,
      sourceNodeId: "a1",
    });
    await owner.post(`/api/projects/${project.id}/mappings`).send({
      canonicalNodeKey: "demand",
      canonicalNodeLabel: "Demand",
      sourceModelId: model2.body.id,
      sourceNodeId: "a2",
    });
    await owner.post(`/api/projects/${project.id}/mappings`).send({
      canonicalNodeKey: "supply",
      canonicalNodeLabel: "Supply",
      sourceModelId: model1.body.id,
      sourceNodeId: "b1",
    });
    await owner.post(`/api/projects/${project.id}/mappings`).send({
      canonicalNodeKey: "supply",
      canonicalNodeLabel: "Supply",
      sourceModelId: model2.body.id,
      sourceNodeId: "b2",
    });

    const meanPreview = await owner.get(`/api/projects/${project.id}/meta-model?modelIds=${model1.body.id},${model2.body.id}&aggregationMethod=mean`);
    expect(meanPreview.status).toBe(200);
    expect(meanPreview.body.aggregationMethod).toBe("mean");
    expect(Array.isArray(meanPreview.body.edgeMetadata)).toBe(true);
    expect(meanPreview.body.edgeMetadata[0].hasSignConflict).toBe(true);
    expect(meanPreview.body.edgeMetadata[0].confidence).toBe("low");
    expect(meanPreview.body.edgeMetadata[0].aggregatedWeight).toBeCloseTo(0, 5);

    const medianPreview = await owner.get(`/api/projects/${project.id}/meta-model?modelIds=${model1.body.id},${model2.body.id}&aggregationMethod=median`);
    expect(medianPreview.status).toBe(200);
    expect(medianPreview.body.aggregationMethod).toBe("median");
    expect(Array.isArray(medianPreview.body.edgeMetadata)).toBe(true);
    expect(typeof medianPreview.body.edgeMetadata[0].aggregatedWeight).toBe("number");
  });
});
