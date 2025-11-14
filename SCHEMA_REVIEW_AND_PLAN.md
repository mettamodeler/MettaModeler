# Schema-First Architecture: Comprehensive Review & Migration Plan

**Date:** November 14, 2025  
**Status:** Foundation Complete - Ready for Strategic Migration

---

## Executive Summary

✅ **Phase 1 & 2 Complete:** Schema files created, codegen working  
⚠️ **Critical Finding:** Shared types (FCMNode, FCMEdge, SimulationNode) are duplicated across schemas  
🎯 **Best Path:** Extract shared types first, then migrate entities in dependency order

---

## Current State Analysis

### 1. Type Dependencies Graph

```
User (standalone)
  ↓
Project (depends on: User)
  ↓
Model (depends on: Project, FCMNode, FCMEdge)
  ↓
Scenario (depends on: Model, SimulationNode, SimulationParameters, SimulationResult)

Shared Types (used by multiple entities):
- FCMNode (used by: Model, SimulationInput)
- FCMEdge (used by: Model, SimulationInput)
- SimulationNode (used by: Scenario, SimulationInput, SimulationResult)
- SimulationParameters (used by: Scenario, SimulationInput)
- SimulationResult (used by: Scenario)
```

### 2. Current Type Sources

#### A. Database Layer (`shared/schema.ts`)
- **Purpose:** Drizzle ORM table definitions + manual TypeScript interfaces
- **Contains:**
  - Drizzle table schemas (users, projects, models, scenarios)
  - Manual interfaces: `FCMNode`, `FCMEdge`, `SimulationNode`, `SimulationResult`, `SimulationParameters`
  - Drizzle-inferred types: `User`, `Project`, `Model`, `Scenario`
  - Insert schemas (Drizzle-Zod generated)

#### B. Validation Layer (`server/types/*.v2.zod.ts`)
- **Purpose:** API request/response validation
- **Contains:**
  - Manual Zod schemas for Project, Model, Scenario
  - **Dependency:** Imports `FCMNode`, `FCMEdge`, `SimulationNode` from `@shared/schema`
  - Custom schemas: `CreateModelSchema`, `CreateScenarioSchema`, `ScenarioStorageSchema`

#### C. Frontend Layer (`client/src/lib/types.ts`)
- **Purpose:** Frontend type definitions
- **Contains:**
  - Re-exports from `@shared/schema`
  - Extended types: `ExtendedSimulationResult`, `BaseScenario`, etc.

#### D. Generated Layer (NEW - `schemas/*.v1.json`)
- **Purpose:** Single source of truth (target state)
- **Status:** ✅ Created, ⚠️ Not yet integrated
- **Issue:** Shared types duplicated across multiple schema files

### 3. Critical Issues Identified

#### Issue #1: Shared Types Duplication ⚠️ HIGH PRIORITY

**Problem:** `FCMNode`, `FCMEdge`, `SimulationNode` are defined in multiple schema files:

- `FCMNode` & `FCMEdge`: Defined in `Model.v1.json` AND `SimulationInput.v1.json`
- `SimulationNode`: Defined in `Scenario.v1.json` AND `SimulationInput.v1.json`

**Impact:**
- No single source of truth for shared types
- Risk of schema drift
- Codegen generates duplicate types

**Solution:** Extract shared types to separate schema files with `$ref` references.

#### Issue #2: Dependency on Manual Types ⚠️ MEDIUM PRIORITY

**Problem:** 
- `server/types/*.v2.zod.ts` imports from `@shared/schema` (manual types)
- Generated Zod schemas can't reference manual TypeScript types
- Creates circular dependency risk

**Impact:**
- Can't fully migrate to generated types
- Manual synchronization required

**Solution:** Generate shared type schemas first, then update references.

#### Issue #3: Version Mismatch ⚠️ LOW PRIORITY

**Problem:**
- Generated schemas: `*.v1.*`
- Manual Zod: `*.v2.zod.ts`
- No clear versioning strategy

**Impact:**
- Confusion about which version to use
- Migration path unclear

**Solution:** Use v1 for now, document migration to v2 later if needed.

#### Issue #4: Case Mapping Utilities ⚠️ MEDIUM PRIORITY

**Problem:**
- `server/utils/caseMapping.ts` exists to convert snake_case ↔ camelCase
- Indicates schema/API mismatch

**Impact:**
- Runtime conversion overhead
- Maintenance burden

**Solution:** Standardize on camelCase in schemas, ensure Drizzle uses camelCase.

---

## Recommended Migration Strategy

### Phase 3A: Extract Shared Types (Week 1)

**Goal:** Create single source of truth for shared types

#### Step 1: Create Shared Type Schemas

Create separate schema files for shared types:

```
schemas/
├── FCMNode.v1.json          # NEW - Shared node type
├── FCMEdge.v1.json          # NEW - Shared edge type
├── SimulationNode.v1.json    # NEW - Shared simulation node type
├── SimulationParameters.v1.json  # NEW - Shared parameters
├── SimulationResult.v1.json    # NEW - Shared result type
├── SimulationInput.v1.json   # UPDATE - Use $ref to shared types
├── Model.v1.json             # UPDATE - Use $ref to FCMNode/FCMEdge
├── Scenario.v1.json          # UPDATE - Use $ref to SimulationNode
├── Project.v1.json           # No changes needed
└── User.v1.json              # No changes needed
```

#### Step 2: Update Entity Schemas to Use $ref

Example for `Model.v1.json`:
```json
{
  "properties": {
    "nodes": {
      "type": "array",
      "items": { "$ref": "../FCMNode.v1.json" }
    },
    "edges": {
      "type": "array",
      "items": { "$ref": "../FCMEdge.v1.json" }
    }
  }
}
```

#### Step 3: Regenerate All Types

```bash
npm run codegen:all
```

**Validation:**
- ✅ No duplicate type definitions
- ✅ All references resolve correctly
- ✅ Generated types match existing manual types

### Phase 3B: Migrate Shared Types First (Week 1-2)

**Goal:** Replace manual shared types with generated ones

#### Step 1: Create Type Export Module

Create `shared/types.ts` (or `shared/generated.ts`):
```typescript
// Re-export generated types
export type { FCMNode } from '../server/types/generated/FCMNode.v1';
export type { FCMEdge } from '../server/types/generated/FCMEdge.v1';
export type { SimulationNode } from '../server/types/generated/SimulationNode.v1';
// ... etc
```

#### Step 2: Update Imports Gradually

1. Update `server/types/*.v2.zod.ts` to import from generated types
2. Update `client/src/lib/types.ts` to import from generated types
3. Update `server/storage.ts` to use generated types
4. Test after each change

#### Step 3: Remove Manual Type Definitions

Once all imports updated:
- Remove `FCMNode`, `FCMEdge`, `SimulationNode` interfaces from `shared/schema.ts`
- Keep only Drizzle table definitions

**Validation:**
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ Application runs correctly

### Phase 3C: Migrate Entities in Dependency Order (Week 2-3)

**Order:** User → Project → Model → Scenario

#### User (Week 2, Day 1)
- ✅ Simplest, no dependencies
- Update `server/auth.ts` to use generated types
- Remove manual User type from `shared/schema.ts`
- Test: Login, register, user management

#### Project (Week 2, Day 2-3)
- ✅ Depends on User (already migrated)
- Update `server/routes.ts` project endpoints
- Update `server/storage.ts` project methods
- Remove manual Project type
- Test: CRUD operations

#### Model (Week 2, Day 4-5)
- ⚠️ Depends on Project + FCMNode/FCMEdge (migrated in 3B)
- Update `server/routes.ts` model endpoints
- Update `client/src/components/fcm/FCMEditor.tsx`
- Update `server/storage.ts` model methods
- Remove manual Model type
- Test: Model creation, editing, visualization

#### Scenario (Week 3, Day 1-3)
- ⚠️ Most complex, depends on Model + SimulationNode/Result/Parameters
- Update `server/routes.ts` scenario endpoints
- Update `client/src/components/scenario/*`
- Update `server/storage.ts` scenario methods
- Remove manual Scenario type
- Test: Scenario creation, simulation, comparison

### Phase 3D: Cleanup & Documentation (Week 3, Day 4-5)

#### Remove Legacy Code
- [ ] Delete `server/types/*.v2.zod.ts` (replaced by generated)
- [ ] Remove `server/utils/caseMapping.ts` (if no longer needed)
- [ ] Clean up unused imports

#### Update Documentation
- [ ] Update `docs/architecture.md` with actual implementation
- [ ] Create migration guide for future schema changes
- [ ] Document versioning strategy

#### Final Validation
- [ ] All tests pass
- [ ] CI/CD passes
- [ ] No TypeScript errors
- [ ] Application fully functional
- [ ] Codegen drift check passes

---

## Dependency Management Strategy

### Single Source of Truth Hierarchy

```
1. JSON Schema Files (schemas/*.v1.json)
   ↓
2. Generated TypeScript Types (server/types/generated/*.v1.ts)
   ↓
3. Generated Zod Schemas (server/types/generated/*.v1.zod.ts)
   ↓
4. Application Code (imports from generated types)
```

### Drizzle Schema Separation

**Keep Separate:** `shared/schema.ts` should ONLY contain:
- Drizzle table definitions (database schema)
- Drizzle-inferred types (for database operations)
- Insert schemas (Drizzle-Zod generated)

**Remove:** Manual TypeScript interfaces (migrate to generated types)

### Import Strategy

**Before Migration:**
```typescript
import { FCMNode, FCMEdge } from '@shared/schema';  // Manual
```

**After Migration:**
```typescript
import { FCMNode, FCMEdge } from '@shared/generated';  // Generated
// OR
import { FCMNode, FCMEdge } from '../server/types/generated/FCMNode.v1';
```

---

## Risk Mitigation

### Risk 1: Breaking Changes During Migration
**Mitigation:**
- Migrate one entity at a time
- Keep manual types until migration complete
- Test thoroughly after each step
- Use feature flags if needed

### Risk 2: Type Incompatibilities
**Mitigation:**
- Compare generated vs manual types before migration
- Create type compatibility tests
- Use TypeScript's type system to catch issues

### Risk 3: Schema Drift
**Mitigation:**
- CI/CD checks for codegen drift
- Document schema change process
- Require schema changes to be reviewed

### Risk 4: Performance Impact
**Mitigation:**
- Generated types should have no runtime impact
- Case mapping removal may improve performance
- Monitor after migration

---

## Success Criteria

### Phase 3A Complete:
- [x] Shared type schemas created
- [ ] Entity schemas use $ref
- [ ] Codegen generates without duplicates
- [ ] All types resolve correctly

### Phase 3B Complete:
- [ ] Shared types migrated to generated
- [ ] All imports updated
- [ ] Manual shared types removed
- [ ] Tests pass

### Phase 3C Complete:
- [ ] All entities migrated
- [ ] All manual types removed
- [ ] Application fully functional
- [ ] No TypeScript errors

### Phase 3D Complete:
- [ ] Legacy code removed
- [ ] Documentation updated
- [ ] CI/CD passing
- [ ] Codegen drift check working

---

## Next Immediate Steps

1. **Create shared type schemas** (FCMNode, FCMEdge, SimulationNode, etc.)
2. **Update entity schemas** to use $ref
3. **Test codegen** to ensure no duplicates
4. **Compare generated vs manual** types for compatibility
5. **Begin Phase 3B** migration with shared types

---

## Questions to Resolve

1. **Versioning:** Keep v1 or migrate to v2? (Recommendation: Keep v1 for now)
2. **Drizzle:** Keep Drizzle schema separate or generate from JSON Schema? (Recommendation: Keep separate - Drizzle is database-specific)
3. **Case Mapping:** Remove case mapping utilities? (Recommendation: Yes, after ensuring camelCase consistency)
4. **Backward Compatibility:** Support both manual and generated types during migration? (Recommendation: Yes, gradual migration)

---

**Ready to proceed?** Start with Phase 3A: Extract shared types.

