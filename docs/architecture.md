# MettaModeler Architecture

## Schema-First Workflow
- All core data models are defined in `/schemas` as versioned JSON-Schema files (e.g., `SimulationInput.v1.json`).
- These schemas are the **single source of truth** for backend, frontend, and Python simulation service.
- Every time a schema changes, bump its semantic version and regenerate downstream code.

## Code-Gen & CI Pipeline
- **TypeScript types** and **Zod schemas** are generated from JSON-Schema using `json-schema-to-typescript` and `json-schema-to-zod`.
- **Python Pydantic models** are generated using `datamodel-code-generator` (Pydantic v2 compatible).
- Codegen scripts are in `package.json`:
  ```json
  "codegen:ts": "json-schema-to-typescript -o client/src/api/types/ schemas/*.json && json-schema-to-typescript -o server/types/ schemas/*.json",
  "codegen:zod": "json-schema-to-zod ...",
  "codegen:py": "datamodel-code-generator --pydantic-version 2.0 ..."
  ```
- To update all types after a schema change:
  ```sh
  npm run codegen:ts
  npm run codegen:zod
  npm run codegen:py
  ```
- **CI** should run codegen and fail if there is drift (uncommitted changes).
- Example GitHub Actions workflow:
  ```yaml
  - name: Run codegen
    run: |
      npm run codegen:ts
      npm run codegen:zod
      npm run codegen:py
  - name: Check for drift
    run: git diff --exit-code || (echo 'Codegen drift detected! Run codegen and commit.' && exit 1)
  ```

## Validation & Error Handling
- Express uses Zod for strict validation; extra fields are rejected.
- Python uses Pydantic with `extra = 'forbid'` and `Literal` for const fields.
- Standardized error responses:
  ```json
  {
    "status": 400,
    "code": "INVALID_PAYLOAD",
    "fieldErrors": [
      { "path": "nodes[3].weight", "message": "Expected number but got string" }
    ]
  }
  ```

## Versioning Strategy
- Every schema and payload includes a `schemaVersion` property.
- API routes will be versioned as `/api/v1/...`, `/api/v2/...` for breaking changes.
- Major schema version bumps require a new API route version and codegen run.

## Plugin Model
- Plugins can register backend routes (`registerBackendRoutes(app: Express)`) and UI components (`registerUIComponents(pluginRoot: string)`).
- Advanced plugin features (event buses, sandboxing) are planned for future releases.

## Performance & Observability
- Express→Python calls are instrumented for timing and error rates (planned).
- Async job queue (e.g., Redis, RabbitMQ) is recommended for long-running simulations (planned).

## Security & ACLs
- Express enforces ACLs on every route (planned).
- Python service is locked down to only accept requests from Express (planned).

## Migration Practices
- Database migrations are managed with Drizzle Kit.
- Migrations are versioned and run automatically in CI/CD.

## Monorepo Onboarding Guide
- All code is in a single repo:
  ```
  /schemas
  /server       ← Express API + Zod schemas + migrations
  /python_sim   ← Flask + Pydantic models + simulation engine
  /client       ← React front end + generated TS types
  /docs
  ```
- To update types, run:
  ```sh
  npm run codegen:ts
  npm run codegen:zod
  npm run codegen:py
  ```
- Commit any changes in generated files. CI will fail if you forget to update generated files.
- See `/README.md` for setup.
- See `/docs/architecture.md` for conventions and workflow. 