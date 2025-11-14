# Schema Migration Roadmap: Safe & Strategic Path Forward

**Date:** November 14, 2025  
**Status:** ✅ Foundation Ready - Strategic Migration Plan Defined

---

## 🎯 Core Principles

1. **Single Source of Truth:** JSON Schema files in `/schemas` are the authoritative definition
2. **Dependency-Aware Migration:** Migrate in order: Shared Types → User → Project → Model → Scenario
3. **Zero Downtime:** Keep manual types until migration complete, test at each step
4. **Backward Compatible:** Support both manual and generated types during transition

---

## 📊 Current State Summary

### ✅ What's Working
- 5 JSON Schema files created (`schemas/*.v1.json`)
- Codegen infrastructure working (`scripts/codegen.js`)
- All codegen tools tested and functional
- Generated types in correct locations

### ⚠️ Critical Issues Found

1. **Shared Types Duplication** (HIGH PRIORITY)
   - `FCMNode`, `FCMEdge` defined in both `Model.v1.json` and `SimulationInput.v1.json`
   - `SimulationNode` defined in both `Scenario.v1.json` and `SimulationInput.v1.json`
   - **Fix:** Extract to separate schema files, use `$ref`

2. **Dependency Chain** (MEDIUM PRIORITY)
   - 10+ files import from `@shared/schema` (manual types)
   - Generated types can't reference manual TypeScript types
   - **Fix:** Migrate shared types first, then entities

3. **Version Mismatch** (LOW PRIORITY)
   - Generated: `*.v1.*`
   - Manual: `*.v2.zod.ts`
   - **Fix:** Use v1 for now, document v2 migration later

---

## 🗺️ Migration Phases

### Phase 3A: Extract Shared Types (1-2 days)

**Goal:** Eliminate duplication, create reusable type schemas

#### Actions:
1. Create shared type schemas:
   ```
   schemas/
   ├── FCMNode.v1.json
   ├── FCMEdge.v1.json
   ├── SimulationNode.v1.json
   ├── SimulationParameters.v1.json
   └── SimulationResult.v1.json
   ```

2. Update entity schemas to use `$ref`:
   - `Model.v1.json` → `$ref: "../FCMNode.v1.json"`
   - `Scenario.v1.json` → `$ref: "../SimulationNode.v1.json"`
   - `SimulationInput.v1.json` → `$ref` to all shared types

3. Regenerate all types:
   ```bash
   npm run codegen:all
   ```

4. Validate:
   - ✅ No duplicate type definitions in generated code
   - ✅ All `$ref` resolve correctly
   - ✅ Generated types match manual types structurally

**Risk:** Low - Only schema changes, no code changes yet

---

### Phase 3B: Migrate Shared Types (2-3 days)

**Goal:** Replace manual shared types with generated ones

#### Actions:
1. Create type export module (`shared/generated.ts`):
   ```typescript
   // Re-export generated shared types
   export type { FCMNode } from '../server/types/generated/FCMNode.v1';
   export type { FCMEdge } from '../server/types/generated/FCMEdge.v1';
   export type { SimulationNode } from '../server/types/generated/SimulationNode.v1';
   export type { SimulationParameters } from '../server/types/generated/SimulationParameters.v1';
   export type { SimulationResult } from '../server/types/generated/SimulationResult.v1';
   ```

2. Update imports gradually (one file at a time):
   - Start with `server/types/*.v2.zod.ts` (low risk)
   - Then `client/src/lib/types.ts`
   - Then `server/storage.ts`
   - Then `server/routes.ts`
   - Test after each file

3. Remove manual type definitions from `shared/schema.ts`:
   - Keep: Drizzle table definitions
   - Keep: Drizzle-inferred types
   - Remove: Manual `FCMNode`, `FCMEdge`, `SimulationNode` interfaces

**Risk:** Medium - Requires careful import updates, test thoroughly

**Validation:**
- ✅ All TypeScript compiles
- ✅ All tests pass
- ✅ Application runs correctly
- ✅ No runtime errors

---

### Phase 3C: Migrate Entities (1-2 weeks)

**Order:** User → Project → Model → Scenario (respects dependencies)

#### User (Day 1)
- ✅ No dependencies
- Update: `server/auth.ts`
- Test: Login, register, user management
- Remove: Manual User type

#### Project (Day 2-3)
- ✅ Depends on User (already migrated)
- Update: `server/routes.ts` (project endpoints)
- Update: `server/storage.ts` (project methods)
- Test: CRUD operations
- Remove: Manual Project type

#### Model (Day 4-5)
- ⚠️ Depends on Project + FCMNode/FCMEdge (migrated in 3B)
- Update: `server/routes.ts` (model endpoints)
- Update: `client/src/components/fcm/FCMEditor.tsx`
- Update: `server/storage.ts` (model methods)
- Test: Model creation, editing, visualization
- Remove: Manual Model type

#### Scenario (Day 6-8)
- ⚠️ Most complex, depends on Model + all simulation types
- Update: `server/routes.ts` (scenario endpoints)
- Update: `client/src/components/scenario/*`
- Update: `server/storage.ts` (scenario methods)
- Test: Scenario creation, simulation, comparison
- Remove: Manual Scenario type

**Risk:** Medium-High - Most complex changes, requires extensive testing

---

### Phase 3D: Cleanup & Documentation (2-3 days)

#### Remove Legacy Code
- [ ] Delete `server/types/*.v2.zod.ts` (replaced by generated)
- [ ] Evaluate `server/utils/caseMapping.ts` (remove if no longer needed)
- [ ] Clean up unused imports

#### Update Documentation
- [ ] Update `docs/architecture.md` with actual implementation
- [ ] Create `docs/schema-migration.md` guide
- [ ] Document versioning strategy
- [ ] Update `README.md` if needed

#### Final Validation
- [ ] All tests pass
- [ ] CI/CD passes
- [ ] No TypeScript errors
- [ ] Application fully functional
- [ ] Codegen drift check working

**Risk:** Low - Cleanup only

---

## 🔍 Dependency Analysis

### Import Dependencies (10 files use `@shared/schema`)

**High Priority (Core):**
- `server/storage.ts` - Uses all types
- `server/routes.ts` - Uses all types
- `server/types/*.v2.zod.ts` - Uses FCMNode, FCMEdge, SimulationNode

**Medium Priority (Features):**
- `client/src/lib/types.ts` - Re-exports all types
- `server/export.ts` - Uses FCMModel, FCMNode, FCMEdge, Scenario
- `server/auth.ts` - Uses User

**Low Priority (UI):**
- `client/src/components/layout/AppHeader.tsx`
- `client/src/components/scenario/CompareConvergencePlot.tsx`

### Entity Dependencies

```
User (no dependencies)
  ↓
Project (depends on: User)
  ↓
Model (depends on: Project, FCMNode, FCMEdge)
  ↓
Scenario (depends on: Model, SimulationNode, SimulationParameters, SimulationResult)
```

**Migration Order:** Must follow this dependency chain

---

## 🛡️ Risk Mitigation

### Risk 1: Breaking Changes
**Mitigation:**
- Keep manual types until migration complete
- Migrate one entity at a time
- Test after each change
- Use TypeScript to catch type errors

### Risk 2: Type Incompatibilities
**Mitigation:**
- Compare generated vs manual types before migration
- Create compatibility tests
- Use gradual migration (support both during transition)

### Risk 3: Schema Drift
**Mitigation:**
- CI/CD checks for codegen drift
- Document schema change process
- Require schema changes to be reviewed

### Risk 4: Case Mapping Issues
**Mitigation:**
- Ensure all schemas use camelCase
- Verify Drizzle uses camelCase
- Test case mapping removal before deleting

---

## 📋 Pre-Migration Checklist

Before starting Phase 3A:

- [x] All schema files created
- [x] Codegen working
- [x] Generated types in correct locations
- [ ] **TODO:** Compare generated vs manual types for compatibility
- [ ] **TODO:** Document any differences found
- [ ] **TODO:** Create test plan for each migration phase
- [ ] **TODO:** Set up feature branch for migration

---

## 🚀 Immediate Next Steps

1. **Review this plan** - Ensure it aligns with project goals
2. **Create feature branch** - `feature/schema-migration`
3. **Start Phase 3A** - Extract shared types
4. **Test thoroughly** - Validate codegen output
5. **Begin Phase 3B** - Migrate shared types

---

## 📝 Notes

### Version Strategy
- **Current:** Use v1 for generated types
- **Future:** Can migrate to v2 if breaking changes needed
- **Recommendation:** Keep v1 for now, document v2 migration path

### Drizzle Schema
- **Keep Separate:** Drizzle table definitions stay in `shared/schema.ts`
- **Reason:** Drizzle is database-specific, JSON Schema is API-specific
- **Migration:** Only migrate TypeScript interfaces, not Drizzle tables

### Case Mapping
- **Current:** `server/utils/caseMapping.ts` handles snake_case ↔ camelCase
- **Goal:** Remove after ensuring camelCase consistency
- **Action:** Verify Drizzle uses camelCase, update if needed

---

## ✅ Success Criteria

### Phase 3A Complete:
- [ ] Shared type schemas created (FCMNode, FCMEdge, etc.)
- [ ] Entity schemas use `$ref` to shared types
- [ ] Codegen generates without duplicates
- [ ] All `$ref` resolve correctly

### Phase 3B Complete:
- [ ] Shared types migrated to generated
- [ ] All imports updated (10 files)
- [ ] Manual shared types removed from `shared/schema.ts`
- [ ] All tests pass

### Phase 3C Complete:
- [ ] All 4 entities migrated (User, Project, Model, Scenario)
- [ ] All manual types removed
- [ ] Application fully functional
- [ ] No TypeScript errors

### Phase 3D Complete:
- [ ] Legacy code removed
- [ ] Documentation updated
- [ ] CI/CD passing
- [ ] Codegen drift check working

---

**Ready to begin?** Start with Phase 3A: Extract shared types.

