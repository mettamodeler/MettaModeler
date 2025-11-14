# Schema-First Implementation Plan
**Detailed Step-by-Step Guide**

## Current State Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    INTENDED ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  /schemas/*.json (JSON Schema - Single Source of Truth)     │
│           │                                                   │
│           ├─→ codegen:ts → TypeScript Types                  │
│           ├─→ codegen:zod → Zod Schemas                      │
│           └─→ codegen:py → Python Pydantic Models            │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    CURRENT REALITY                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Python: simulation_schema.py (Pydantic)                     │
│    └─→ export_schema.py → simulation_input.schema.json      │
│         (in python_sim/, wrong location)                      │
│                                                               │
│  TypeScript: shared/schema.ts (Manual)                       │
│    └─→ Used directly, not generated                          │
│                                                               │
│  Zod: server/types/*.v2.zod.ts (Manual)                      │
│    └─→ Written by hand, not generated                       │
│                                                               │
│  /schemas/ directory: ❌ DOES NOT EXIST                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Create Schema Directory Structure

```bash
# Create the schemas directory
mkdir -p schemas

# Create output directories for generated code
mkdir -p client/src/api/types
mkdir -p python_sim/schemas
```

### Step 2: Extract/Create JSON Schema Files

#### 2a. SimulationInput.v1.json (Easiest - Already Exists)

```bash
# Move and rename the existing schema
cp python_sim/simulation_input.schema.json schemas/SimulationInput.v1.json

# Then normalize it (add metadata, ensure proper format)
```

**Required Normalization:**
- Add `$schema` field
- Add `$id` for versioning
- Ensure all field names are camelCase
- Add description fields

#### 2b. Create Other Schema Files

We need to create JSON Schema files for:
- `Project.v1.json`
- `Model.v1.json`
- `Scenario.v1.json`
- `User.v1.json`

**Source Material:**
- `shared/schema.ts` - Drizzle table definitions
- `server/types/*.v2.zod.ts` - Existing Zod schemas

### Step 3: Test Codegen Scripts

```bash
# Install codegen tools (if not already installed)
npm install

# Test TypeScript generation
npm run codegen:ts

# Test Zod generation
npm run codegen:zod

# Test Python generation
npm run codegen:py
```

**Expected Output:**
- `client/src/api/types/SimulationInput.ts`
- `server/types/SimulationInput.v1.ts`
- `server/types/SimulationInput.v1.zod.ts`
- `python_sim/schemas/simulation_input_v1.py`

### Step 4: Compare Generated vs Manual Types

For each entity, compare:
1. Generated TypeScript types vs `shared/schema.ts`
2. Generated Zod schemas vs `server/types/*.v2.zod.ts`
3. Generated Python models vs existing Python code

**Action Items:**
- Document differences
- Decide: Update schema or update code?
- Create migration checklist

### Step 5: Incremental Migration

#### Phase 5a: SimulationInput (Lowest Risk)

1. Generate types
2. Create new import paths
3. Update one file at a time
4. Test after each change
5. Remove old manual types

#### Phase 5b: Project/Model/Scenario/User

Repeat for each entity, one at a time.

## Detailed Schema File Creation

### SimulationInput.v1.json Template

Based on `python_sim/simulation_input.schema.json`, normalize to:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://mettamodeler.com/schemas/SimulationInput.v1.json",
  "title": "SimulationInput",
  "description": "Input schema for FCM simulation",
  "type": "object",
  "properties": {
    "schemaVersion": {
      "type": "string",
      "const": "1.0.0",
      "description": "Schema version"
    },
    "nodes": {
      "type": "array",
      "items": { "$ref": "#/$defs/SimulationNode" }
    },
    "edges": {
      "type": "array",
      "items": { "$ref": "#/$defs/SimulationEdge" }
    },
    ...
  },
  "required": ["nodes", "edges"],
  "$defs": {
    "SimulationNode": { ... },
    "SimulationEdge": { ... }
  }
}
```

### Project.v1.json Template

Based on `shared/schema.ts` projects table:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://mettamodeler.com/schemas/Project.v1.json",
  "title": "Project",
  "description": "A project containing multiple FCM models",
  "type": "object",
  "properties": {
    "id": {
      "type": "integer",
      "description": "Unique project identifier"
    },
    "name": {
      "type": "string",
      "description": "Project name"
    },
    "description": {
      "type": ["string", "null"],
      "description": "Project description"
    },
    "userId": {
      "type": ["integer", "null"],
      "description": "Owner user ID"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "Creation timestamp"
    },
    "updatedAt": {
      "type": ["string", "null"],
      "format": "date-time",
      "description": "Last update timestamp"
    }
  },
  "required": ["name"]
}
```

### Model.v1.json Template

Based on `shared/schema.ts` models table and `server/types/Model.v2.zod.ts`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://mettamodeler.com/schemas/Model.v1.json",
  "title": "Model",
  "description": "A Fuzzy Cognitive Map model",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "projectId": { "type": "integer" },
    "name": { "type": "string" },
    "description": { "type": ["string", "null"] },
    "nodes": {
      "type": "array",
      "items": { "$ref": "#/$defs/FCMNode" }
    },
    "edges": {
      "type": "array",
      "items": { "$ref": "#/$defs/FCMEdge" }
    },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": ["string", "null"], "format": "date-time" }
  },
  "required": ["projectId", "name", "nodes", "edges"],
  "$defs": {
    "FCMNode": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "type": { "type": "string", "enum": ["driver", "regular", "outcome"] },
        "label": { "type": "string" },
        "value": { "type": "number" },
        "positionX": { "type": "number" },
        "positionY": { "type": "number" },
        "color": { "type": ["string", "null"] }
      },
      "required": ["id", "type", "label", "value", "positionX", "positionY"]
    },
    "FCMEdge": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "source": { "type": "string" },
        "target": { "type": "string" },
        "weight": { "type": "number" },
        "sourceHandle": { "type": ["string", "null"] },
        "targetHandle": { "type": ["string", "null"] }
      },
      "required": ["id", "source", "target", "weight"]
    }
  }
}
```

### Scenario.v1.json Template

Based on `shared/schema.ts` scenarios table and `server/types/Scenario.v2.zod.ts`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://mettamodeler.com/schemas/Scenario.v1.json",
  "title": "Scenario",
  "description": "A simulation scenario based on a model",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "modelId": { "type": "integer" },
    "name": { "type": "string" },
    "description": { "type": ["string", "null"] },
    "nodes": {
      "type": "array",
      "items": { "$ref": "#/$defs/SimulationNode" }
    },
    "initialValues": {
      "type": "object",
      "additionalProperties": { "type": "number" }
    },
    "clampedNodes": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "simulationParams": {
      "$ref": "#/$defs/SimulationParameters"
    },
    "results": {
      "$ref": "#/$defs/SimulationResult"
    },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": ["string", "null"], "format": "date-time" }
  },
  "required": ["modelId", "name", "nodes", "initialValues"],
  "$defs": {
    "SimulationNode": { ... },
    "SimulationParameters": {
      "type": "object",
      "properties": {
        "activation": {
          "type": "string",
          "enum": ["sigmoid", "tanh", "relu", "linear"]
        },
        "threshold": { "type": "number" },
        "maxIterations": { "type": "integer" }
      },
      "required": ["activation", "threshold", "maxIterations"]
    },
    "SimulationResult": { ... }
  }
}
```

### User.v1.json Template

Based on `shared/schema.ts` users table:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://mettamodeler.com/schemas/User.v1.json",
  "title": "User",
  "description": "User account",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "username": { "type": "string" },
    "password": { "type": "string" },
    "displayName": { "type": ["string", "null"] },
    "role": { "type": ["string", "null"], "default": "user" }
  },
  "required": ["username", "password"]
}
```

## Codegen Script Updates Needed

### Current Scripts (package.json)

```json
{
  "codegen:ts": "json-schema-to-typescript -o client/src/api/types/ schemas/*.json && json-schema-to-typescript -o server/types/ schemas/*.json",
  "codegen:zod": "json-schema-to-zod --input schemas/SimulationInput.v1.json --output server/types/SimulationInput.v1.zod.ts && ...",
  "codegen:py": "datamodel-code-generator --input schemas/SimulationInput.v1.json --output python_sim/schemas/simulation_input_v1.py && ..."
}
```

### Issues to Fix

1. **TypeScript Generation**
   - May overwrite existing files
   - Need to handle versioning (v1 vs v2)
   - Consider separate output directories

2. **Zod Generation**
   - Currently hardcoded file paths
   - Should be dynamic based on schemas directory
   - Version naming (v1 vs v2)

3. **Python Generation**
   - Output directory doesn't exist
   - May conflict with existing `simulation_schema.py`

### Recommended Script Updates

```json
{
  "codegen:ts": "mkdir -p client/src/api/types server/types/generated && json-schema-to-typescript -o client/src/api/types/ schemas/*.json && json-schema-to-typescript -o server/types/generated/ schemas/*.json",
  "codegen:zod": "node scripts/generate-zod.js",
  "codegen:py": "node scripts/generate-python.js",
  "codegen:all": "npm run codegen:ts && npm run codegen:zod && npm run codegen:py"
}
```

**Better approach:** Create a Node.js script that:
1. Scans `/schemas` directory
2. Generates files dynamically
3. Handles versioning
4. Doesn't overwrite manual files

## Migration Checklist

### Pre-Migration

- [ ] Create `/schemas` directory
- [ ] Create all 5 JSON Schema files
- [ ] Test codegen scripts work
- [ ] Review generated code
- [ ] Document differences between generated and manual types

### Migration (Per Entity)

For each entity (SimulationInput, Project, Model, Scenario, User):

- [ ] Generate types from schema
- [ ] Create comparison document (generated vs manual)
- [ ] Update imports in one file
- [ ] Test that file works
- [ ] Update imports in next file
- [ ] Repeat until all files updated
- [ ] Remove manual type file
- [ ] Update documentation

### Post-Migration

- [ ] All tests pass
- [ ] CI/CD passes
- [ ] Documentation updated
- [ ] Legacy code removed
- [ ] Case mapping utilities removed (if no longer needed)

## Testing Strategy

### Unit Tests

1. **Schema Validation**
   - Test JSON Schema files are valid
   - Test schemas match expected structure

2. **Generated Type Tests**
   - Test generated TypeScript types compile
   - Test generated Zod schemas validate correctly
   - Test generated Python models work

### Integration Tests

1. **API Endpoint Tests**
   - Test endpoints accept generated types
   - Test validation works with generated Zod schemas

2. **Cross-Language Tests**
   - Test Python ↔ TypeScript communication
   - Test data serialization/deserialization

### Manual Testing

1. **End-to-End Flow**
   - Create project → Create model → Create scenario → Run simulation
   - Verify all steps work with generated types

## Rollback Plan

If migration causes issues:

1. **Keep Manual Types**
   - Don't delete manual types immediately
   - Keep as fallback during migration

2. **Feature Flag**
   - Use feature flag to switch between generated/manual types
   - Easy rollback if needed

3. **Git Branches**
   - Work in feature branch
   - Can revert easily if needed

## Success Metrics

- ✅ All 5 JSON Schema files exist in `/schemas`
- ✅ Codegen scripts run without errors
- ✅ Generated types match existing functionality
- ✅ All tests pass
- ✅ CI/CD passes
- ✅ No manual type files remain (or clearly deprecated)
- ✅ Documentation is accurate

## Timeline Estimate

- **Week 1:** Create schemas, test codegen (Steps 1-3)
- **Week 2:** Compare types, start migration (Steps 4-5a)
- **Week 3:** Complete migration, testing, cleanup (Steps 5b-6)

**Total:** 3 weeks for full implementation

---

**Next Immediate Action:** Create `/schemas` directory and start with `SimulationInput.v1.json`

