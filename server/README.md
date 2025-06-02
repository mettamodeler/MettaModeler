# Server Storage Layer

This directory contains the server-side storage implementation for MettaModeler. The storage layer provides a unified interface for both PostgreSQL and in-memory storage options.

## Architecture

The storage layer is built around the `IStorage` interface, which defines a common set of operations for managing users, projects, models, and scenarios. Two implementations are provided:

1. `PostgresStorage`: Uses PostgreSQL for persistent storage
2. `MemStorage`: Uses in-memory storage for development and testing

## Key Components

### Interfaces

- `IStorage`: The main interface defining all storage operations
- `CreateModelData`: Interface for model creation data
- `CreateScenarioData`: Interface for scenario creation data

### Storage Operations

#### User Operations
- `getUser(id)`: Get user by ID
- `getUserByUsername(username)`: Get user by username
- `createUser(user)`: Create a new user

#### Project Operations
- `getProjects()`: Get all projects
- `getProject(id)`: Get project by ID
- `createProject(project)`: Create a new project
- `updateProject(id, project)`: Update an existing project
- `deleteProject(id)`: Delete a project

#### Model Operations
- `getModels()`: Get all models
- `getModelsByProject(projectId)`: Get models for a specific project
- `getModel(id)`: Get model by ID
- `createModel(data)`: Create a new model
- `updateModel(id, data)`: Update an existing model
- `deleteModel(id)`: Delete a model

#### Scenario Operations
- `getScenarios()`: Get all scenarios
- `getScenariosByModel(modelId)`: Get scenarios for a specific model
- `getScenario(id)`: Get scenario by ID
- `createScenario(data)`: Create a new scenario
- `updateScenario(id, data)`: Update an existing scenario
- `deleteScenario(id)`: Delete a scenario

## Usage

The storage layer is automatically configured based on the presence of a `DATABASE_URL` environment variable:

```typescript
const usePostgres = !!process.env.DATABASE_URL;
export const storage = usePostgres ? new PostgresStorage(db) : new MemStorage(false);
```

## Data Types

All data types are imported from `@shared/schema`:

- `User`, `InsertUser`
- `Project`, `InsertProject`
- `Model`, `InsertModel`
- `Scenario`, `InsertScenario`
- `FCMNode`, `FCMEdge`
- `SimulationResult`, `SimulationParameters`

## Best Practices

1. Always use the `IStorage` interface when working with storage operations
2. Handle null/undefined cases appropriately
3. Use proper error handling for database operations
4. Keep the storage layer focused on data operations only
5. Use transactions for operations that require atomicity

## Future Updates

When making updates to the storage layer:

1. Update the `IStorage` interface first
2. Implement changes in both `PostgresStorage` and `MemStorage`
3. Add appropriate error handling
4. Update tests to cover new functionality
5. Document any changes to the data model or operations 