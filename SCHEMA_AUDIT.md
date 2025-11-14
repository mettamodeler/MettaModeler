# Schema-First Architecture Deep Audit
**Date:** January 2025  
**Branch:** `feature/express-migration`

## Executive Summary

The project was designed with a **schema-first architecture** in mind, but the implementation is **incomplete and inconsistent**. The intended workflow exists in documentation and codegen scripts, but the actual schema files and generated code are missing or misaligned.

**Status:** ⚠️ **Partially Implemented - Needs Completion**

---

## Intended Architecture (From Documentation)

### Schema-First Workflow (Per `docs/architecture.md`)

```
JSON Schema Files (/schemas/*.json)
    ↓
    ├─→ TypeScript Types (client/src/api/types/, server/types/)
    ├─→ Zod Schemas (server/types/*.zod.ts)
    └─→ Python Pydantic Models (python_sim/schemas/*.py)
```

**Key Principles:**
1. JSON Schema files in `/schemas` are the **single source of truth**
2. All types are **generated** from these schemas
3. Schema versioning (e.g., `SimulationInput.v1.json`)
4. CI checks for codegen drift

---

## Current Reality

### ✅ What EXISTS

1. **Codegen Scripts** (`package.json`)
   - `codegen:ts` - Generates TypeScript types from JSON Schema
   - `codegen:zod` - Generates Zod schemas from JSON Schema
   - `codegen:py` - Generates Python Pydantic models from JSON Schema
   - **Status:** Scripts exist but reference missing files

2. **Python Pydantic Models** (`python_sim/simulation_schema.py`)
   - `SimulationInputSchema` - Well-defined Pydantic model
   - Can export JSON Schema via `export_schema.py`
   - **Status:** ✅ Working, but in reverse direction (Python → JSON Schema)

3. **Generated JSON Schema** (`python_sim/simulation_input.schema.json`)
   - Generated from Pydantic model
   - **Status:** ✅ Exists, but in wrong location (should be in `/schemas`)

4. **CI/CD Workflow** (`.github/workflows/codegen.yml`)
   - Checks for codegen drift
   - **Status:** ⚠️ Will fail because schemas don't exist

5. **Manual Type Definitions**
   - `shared/schema.ts` - Drizzle ORM schema + TypeScript interfaces
   - `server/types/*.zod.ts` - Manual Zod schemas (v2 naming)
   - `client/src/types/scenario.ts` - Manual frontend types
   - **Status:** ✅ Working, but not generated

### ❌ What's MISSING

1. **`/schemas` Directory**
   - **Expected:** Root-level `/schemas` directory with JSON Schema files
   - **Reality:** Directory doesn't exist
   - **Impact:** Codegen scripts fail immediately

2. **JSON Schema Files**
   - **Expected:** 
     - `schemas/SimulationInput.v1.json`
     - `schemas/Project.v1.json`
     - `schemas/Model.v1.json`
     - `schemas/Scenario.v1.json`
     - `schemas/User.v1.json`
   - **Reality:** None exist in `/schemas`
   - **Impact:** Cannot generate types

3. **Generated Type Directories**
   - **Expected:** `client/src/api/types/` for generated TypeScript types
   - **Reality:** Directory doesn't exist
   - **Expected:** `python_sim/schemas/` for generated Python models
   - **Reality:** Directory doesn't exist

4. **Codegen Tool Installation**
   - **Issue:** `json-schema-to-typescript` command not found when running codegen
   - **Status:** Tool is in `devDependencies` but may need global install or npx

---

## Detailed Analysis

### 1. Schema File Locations

| Schema | Expected Location | Actual Location | Status |
|--------|------------------|-----------------|--------|
| SimulationInput | `/schemas/SimulationInput.v1.json` | `python_sim/simulation_input.schema.json` | ⚠️ Wrong location, wrong name |
| Project | `/schemas/Project.v1.json` | ❌ Missing | ❌ Not found |
| Model | `/schemas/Model.v1.json` | ❌ Missing | ❌ Not found |
| Scenario | `/schemas/Scenario.v1.json` | ❌ Missing | ❌ Not found |
| User | `/schemas/User.v1.json` | ❌ Missing | ❌ Not found |

### 2. Type Definitions Comparison

#### SimulationInput

**Python (Pydantic):**
- ✅ `python_sim/simulation_schema.py` - Well-defined
- ✅ Can export JSON Schema

**TypeScript:**
- ⚠️ `shared/schema.ts` - Manual interfaces
- ⚠️ No generated types

**Zod:**
- ❌ Should be generated from JSON Schema
- ⚠️ Currently using manual Zod schemas in `server/types/`

#### Project/Model/Scenario/User

**Database (Drizzle):**
- ✅ `shared/schema.ts` - Drizzle table definitions

**TypeScript:**
- ✅ `shared/schema.ts` - Manual type definitions
- ✅ `server/types/*.zod.ts` - Manual Zod schemas (v2 naming)

**Python:**
- ❌ Should be generated from JSON Schema
- ❌ No Pydantic models exist

### 3. Codegen Script Analysis

#### `codegen:ts`
```bash
json-schema-to-typescript -o client/src/api/types/ schemas/*.json && \
json-schema-to-typescript -o server/types/ schemas/*.json
```
**Issues:**
- Requires `/schemas/*.json` files (don't exist)
- Outputs to `client/src/api/types/` (directory doesn't exist)
- Would overwrite existing manual types in `server/types/`

#### `codegen:zod`
```bash
json-schema-to-zod --input schemas/SimulationInput.v1.json --output server/types/SimulationInput.v1.zod.ts && \
...
```
**Issues:**
- Requires specific schema files (don't exist)
- Would generate `*.v1.zod.ts` files
- Current files are `*.v2.zod.ts` (version mismatch)

#### `codegen:py`
```bash
datamodel-code-generator --input schemas/SimulationInput.v1.json --output python_sim/schemas/simulation_input_v1.py && \
...
```
**Issues:**
- Requires schema files (don't exist)
- Outputs to `python_sim/schemas/` (directory doesn't exist)
- Would generate new files, but Python already has `simulation_schema.py`

---

## Root Cause Analysis

### Why This Happened

1. **Reverse Engineering Approach**
   - Python Pydantic models were created first
   - JSON Schema was generated FROM Python (reverse direction)
   - TypeScript types were written manually
   - Schema-first workflow was never fully implemented

2. **Incremental Development**
   - Types were added as needed
   - No systematic schema-first implementation
   - Documentation describes intended state, not current state

3. **Version Mismatch**
   - Codegen scripts expect `*.v1.json` schemas
   - Current Zod files are `*.v2.zod.ts`
   - Indicates schema evolution without proper versioning

---

## Impact Assessment

### High Impact Issues

1. **No Single Source of Truth**
   - Types defined in multiple places
   - Risk of drift between Python, TypeScript, and Zod
   - Manual synchronization required

2. **Codegen Scripts Don't Work**
   - Cannot regenerate types
   - CI/CD will fail
   - Documentation is misleading

3. **Type Inconsistencies**
   - Case mapping utilities needed (`server/utils/caseMapping.ts`)
   - Runtime type mismatches possible
   - Maintenance burden

### Medium Impact Issues

4. **Version Confusion**
   - v1 vs v2 naming inconsistency
   - No clear versioning strategy

5. **Missing Generated Code**
   - No generated TypeScript types
   - No generated Python models for Project/Model/Scenario/User

---

## Current Type System Map

### SimulationInput Flow

```
Python: simulation_schema.py (Pydantic)
    ↓ (export_schema.py)
    → simulation_input.schema.json (in python_sim/)
    
TypeScript: shared/schema.ts (manual interfaces)
    → Used directly in code
    
Zod: ❌ Not generated, manual validation in routes
```

### Project/Model/Scenario/User Flow

```
Database: shared/schema.ts (Drizzle tables)
    ↓
TypeScript: shared/schema.ts (inferred types)
    ↓
Zod: server/types/*.v2.zod.ts (manual schemas)
    
Python: ❌ No models exist
```

---

## Proposed Solution Plan

### Phase 1: Create Schema Foundation (Week 1)

**Goal:** Establish `/schemas` directory with JSON Schema files

1. **Create `/schemas` directory**
   ```bash
   mkdir -p schemas
   ```

2. **Extract/Create JSON Schema Files**
   - Move `python_sim/simulation_input.schema.json` → `schemas/SimulationInput.v1.json`
   - Create `schemas/Project.v1.json` from `shared/schema.ts`
   - Create `schemas/Model.v1.json` from `shared/schema.ts`
   - Create `schemas/Scenario.v1.json` from `shared/schema.ts`
   - Create `schemas/User.v1.json` from `shared/schema.ts`

3. **Normalize Schema Format**
   - Ensure all schemas follow JSON Schema spec
   - Add `$schema` and version metadata
   - Standardize field naming (camelCase)

### Phase 2: Set Up Codegen Infrastructure (Week 1)

**Goal:** Make codegen scripts work

1. **Create Output Directories**
   ```bash
   mkdir -p client/src/api/types
   mkdir -p python_sim/schemas
   ```

2. **Test Codegen Scripts**
   - Run `npm run codegen:ts` (should generate TypeScript types)
   - Run `npm run codegen:zod` (should generate Zod schemas)
   - Run `npm run codegen:py` (should generate Python models)

3. **Handle Version Conflicts**
   - Decide: v1 or v2?
   - Update codegen scripts to match chosen version
   - Or support both versions during migration

### Phase 3: Migration Strategy (Week 2)

**Goal:** Transition from manual types to generated types

**Option A: Big Bang Migration**
- Generate all types
- Update all imports
- Remove manual type files
- **Risk:** High, breaks everything at once

**Option B: Incremental Migration** (Recommended)
- Keep manual types as fallback
- Generate new types alongside
- Migrate one entity at a time (SimulationInput → Project → Model → Scenario → User)
- Update imports gradually
- Remove manual types after verification

**Option C: Hybrid Approach**
- Use generated types for new code
- Keep manual types for existing code
- Migrate on touch (when file is modified)

### Phase 4: Validation & Testing (Week 2-3)

**Goal:** Ensure generated types match existing behavior

1. **Type Compatibility Checks**
   - Compare generated types with manual types
   - Identify differences
   - Update schemas to match or update code to match schemas

2. **Runtime Testing**
   - Test API endpoints with generated types
   - Verify validation works
   - Check Python ↔ TypeScript communication

3. **Update CI/CD**
   - Ensure codegen workflow passes
   - Add type checking to CI

### Phase 5: Documentation & Cleanup (Week 3)

**Goal:** Align documentation with reality

1. **Update Documentation**
   - `docs/architecture.md` - Reflect actual workflow
   - `README.md` - Update codegen instructions
   - Add schema modification guide

2. **Remove Legacy Code**
   - Delete manual type files (after migration)
   - Remove case mapping utilities (if no longer needed)
   - Clean up unused imports

---

## Detailed Action Items

### Immediate (This Week)

- [ ] **Create `/schemas` directory**
- [ ] **Extract JSON Schema from Python Pydantic model**
  - Move `python_sim/simulation_input.schema.json` → `schemas/SimulationInput.v1.json`
  - Normalize format (add $schema, version metadata)
- [ ] **Create JSON Schema files for other entities**
  - `schemas/Project.v1.json`
  - `schemas/Model.v1.json`
  - `schemas/Scenario.v1.json`
  - `schemas/User.v1.json`
- [ ] **Create output directories**
  - `client/src/api/types/`
  - `python_sim/schemas/`
- [ ] **Test codegen scripts**
  - Fix any tool installation issues
  - Verify scripts can run without errors

### Short Term (Next 2 Weeks)

- [ ] **Run codegen and review generated files**
  - Compare with existing manual types
  - Identify breaking changes
- [ ] **Choose migration strategy** (Option B recommended)
- [ ] **Migrate SimulationInput first** (simplest, already has schema)
  - Generate types
  - Update imports
  - Test thoroughly
- [ ] **Migrate remaining entities one by one**
- [ ] **Update CI/CD to use codegen**

### Medium Term (Next Month)

- [ ] **Remove manual type files** (after full migration)
- [ ] **Remove case mapping utilities** (if no longer needed)
- [ ] **Update all documentation**
- [ ] **Add schema modification workflow guide**
- [ ] **Set up schema versioning strategy**

---

## Risk Assessment

### High Risk

1. **Breaking Changes During Migration**
   - Generated types may differ from manual types
   - Could break existing functionality
   - **Mitigation:** Incremental migration, thorough testing

2. **Type Incompatibilities**
   - JSON Schema → TypeScript may not match current types exactly
   - Field naming differences (camelCase vs snake_case)
   - **Mitigation:** Schema normalization, careful comparison

### Medium Risk

3. **Version Confusion**
   - v1 vs v2 naming
   - **Mitigation:** Clear versioning strategy, update all references

4. **Tool Compatibility**
   - Codegen tools may have limitations
   - **Mitigation:** Test early, have fallback plan

### Low Risk

5. **Documentation Drift**
   - Documentation may become outdated again
   - **Mitigation:** Keep docs in sync with code

---

## Success Criteria

### Phase 1 Complete When:
- ✅ `/schemas` directory exists with all 5 JSON Schema files
- ✅ All schemas follow JSON Schema spec
- ✅ Schemas are properly versioned

### Phase 2 Complete When:
- ✅ Codegen scripts run without errors
- ✅ Generated files appear in correct locations
- ✅ No tool installation issues

### Phase 3 Complete When:
- ✅ All entities migrated to generated types
- ✅ No manual type files remain (or clearly marked as deprecated)
- ✅ All imports updated

### Phase 4 Complete When:
- ✅ All tests pass with generated types
- ✅ API endpoints work correctly
- ✅ Python ↔ TypeScript communication validated

### Phase 5 Complete When:
- ✅ Documentation updated and accurate
- ✅ CI/CD passes codegen checks
- ✅ Legacy code removed

---

## Recommendations

### Immediate Priority: **HIGH**

1. **Create the `/schemas` directory and initial schema files**
   - This is the foundation for everything else
   - Can be done incrementally (start with SimulationInput)

2. **Test codegen scripts**
   - Identify and fix any tool issues early
   - Understand what the generated code looks like

3. **Choose migration strategy**
   - Recommend Option B (Incremental)
   - Start with SimulationInput (easiest, already has schema)

### Decision Needed

**Version Strategy:**
- Keep v1 naming? (update codegen scripts)
- Or migrate to v2? (update schemas)
- Or support both during transition?

**Recommendation:** Start with v1, migrate to v2 later if needed.

---

## Conclusion

The schema-first architecture is **partially implemented** but **not functional**. The infrastructure exists (codegen scripts, CI workflow) but the foundation (JSON Schema files) is missing. 

**The good news:** Most of the work is already done in Python (Pydantic models) and TypeScript (manual types). We just need to:
1. Extract/create JSON Schema files
2. Make codegen work
3. Migrate incrementally

**Estimated Effort:** 2-3 weeks for full implementation

**Next Step:** Create `/schemas` directory and start with `SimulationInput.v1.json`

---

**Generated:** January 2025  
**Status:** Ready for Implementation

