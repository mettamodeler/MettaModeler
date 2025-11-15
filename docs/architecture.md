# MettaModeler Architecture

## Schema-First Workflow
- All core data models are defined in `/schemas` as versioned JSON-Schema files (e.g., `User.v1.json`, `Project.v1.json`, `Model.v1.json`, `Scenario.v1.json`, `SimulationInput.v1.json`).
- These schemas are the **single source of truth** for backend, frontend, and Python simulation service.
- **All entity types (User, Project, Model, Scenario) and shared types (FCMNode, FCMEdge, SimulationNode, etc.) are generated from JSON Schema.**
- Every time a schema changes, bump its semantic version and regenerate downstream code.

## Code-Gen & CI Pipeline
- **TypeScript types** and **Zod schemas** are generated from JSON-Schema using `json-schema-to-typescript` and `json-schema-to-zod`.
- **Python Pydantic models** are generated using `datamodel-code-generator` (Pydantic v2 compatible).
- **Unified codegen script:** `scripts/codegen.js` handles all codegen with schema bundling (resolves `$ref` references).
- Codegen scripts are in `package.json`:
  ```json
  "codegen:ts": "node scripts/codegen.js ts",
  "codegen:zod": "node scripts/codegen.js zod",
  "codegen:py": "node scripts/codegen.js py",
  "codegen:all": "node scripts/codegen.js all"
  ```
- **To update all types after a schema change:**
  ```sh
  npm run codegen:all
  ```
  Or individually:
  ```sh
  npm run codegen:ts   # TypeScript types → server/types/generated/*.v1.ts
  npm run codegen:zod  # Zod schemas → server/types/generated/*.v1.zod.ts
  npm run codegen:py   # Python models → python_sim/schemas/*_v1.py
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
  /schemas                    ← JSON Schema files (single source of truth)
  /server                     ← Express API + generated Zod schemas + migrations
    /types/generated/         ← Generated TypeScript types and Zod schemas
  /python_sim                 ← Flask + generated Pydantic models + simulation engine
    /schemas/                 ← Generated Python Pydantic models
  /client                     ← React frontend + generated TS types
  /shared                     ← Shared code, re-exports generated types
  /docs
  ```
- **To update types after schema changes:**
  ```sh
  npm run codegen:all
  ```
- **Generated files location:**
  - TypeScript: `server/types/generated/*.v1.ts`
  - Zod: `server/types/generated/*.v1.zod.ts`
  - Python: `python_sim/schemas/*_v1.py`
- **Type imports:** Use `@shared/generated` for shared types, or import directly from `server/types/generated/` for server-specific types.
- **Important:** Always commit generated files. CI will fail if you forget to update generated files after schema changes.
- See `/README.md` for setup.
- See `/docs/architecture.md` for conventions and workflow. 