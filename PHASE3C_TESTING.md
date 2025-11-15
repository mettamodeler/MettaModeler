# Phase 3C Testing Recommendations

**Date:** January 2025  
**Status:** Post-Migration Testing  
**Migration:** All 4 entities (User, Project, Model, Scenario) migrated to generated types

## Overview

Phase 3C migration is complete. All entity types now come from JSON Schema-generated types. This document provides comprehensive testing recommendations to ensure the migration didn't break functionality.

---

## Testing Strategy

### 1. **Quick Smoke Test** (5-10 minutes) ⚡ START HERE

**Goal:** Verify basic application functionality

```bash
# 1. Start all services
./dev.sh start

# 2. Open browser
http://localhost:5173

# 3. Quick checks:
- [ ] Page loads without errors
- [ ] No console errors (F12 → Console)
- [ ] Login page appears
- [ ] Can register new user
- [ ] Can log in
```

**If smoke test fails:** Stop and investigate before proceeding.

---

### 2. **Type Compilation Check** (1 minute)

**Goal:** Verify TypeScript compilation

```bash
npm run check
```

**Expected:** 
- ✅ Only pre-existing errors (server/vite.ts, some client files)
- ❌ No new errors related to User, Project, Model, Scenario types

**If new type errors:** Review and fix before proceeding.

---

### 3. **Manual End-to-End Test** (20-30 minutes) ⭐ CRITICAL

**Goal:** Test complete user workflow with all migrated entities

#### Test Flow: Complete User Journey

1. **Authentication** ✅
   - [ ] Register new user
   - [ ] Log in with credentials
   - [ ] Log out
   - [ ] Log back in
   - [ ] Verify session persists

2. **Project Management** ✅
   - [ ] Create new project
   - [ ] View project list
   - [ ] Edit project name/description
   - [ ] Delete project
   - [ ] Verify project ownership (only see your projects)

3. **Model Creation** ✅
   - [ ] Create new model in project
   - [ ] Add nodes (driver, regular, outcome types)
   - [ ] Add edges between nodes
   - [ ] Set node values
   - [ ] Set edge weights
   - [ ] Save model
   - [ ] Edit existing model
   - [ ] Delete model

4. **Scenario Management** ✅
   - [ ] Create scenario from model
   - [ ] Modify initial node values
   - [ ] Set clamped nodes
   - [ ] Configure simulation parameters
   - [ ] Save scenario
   - [ ] Edit scenario
   - [ ] Delete scenario

5. **Simulation** ✅
   - [ ] Run simulation on scenario
   - [ ] Verify simulation completes
   - [ ] View simulation results
   - [ ] Check time series data
   - [ ] Verify final state values
   - [ ] Run baseline comparison (if available)

6. **Data Persistence** ✅
   - [ ] Refresh page - verify data persists
   - [ ] Log out and log back in - verify data still there
   - [ ] Create multiple projects/models/scenarios
   - [ ] Verify all data loads correctly

---

### 4. **API Endpoint Testing** (15-20 minutes)

**Goal:** Verify all API endpoints work with generated types

#### Test with Browser DevTools or Postman

**User Endpoints:**
```bash
# GET /api/user
# POST /api/register
# POST /api/login
# POST /api/logout
```

**Project Endpoints:**
```bash
# GET /api/projects
# GET /api/projects/:id
# POST /api/projects
# PUT /api/projects/:id
# DELETE /api/projects/:id
```

**Model Endpoints:**
```bash
# GET /api/models
# GET /api/projects/:projectId/models
# GET /api/models/:id
# POST /api/models
# PUT /api/models/:id
# DELETE /api/models/:id
```

**Scenario Endpoints:**
```bash
# GET /api/scenarios
# GET /api/models/:modelId/scenarios
# GET /api/scenarios/:id
# POST /api/scenarios
# PUT /api/scenarios/:id
# DELETE /api/scenarios/:id
```

**Simulation Endpoints:**
```bash
# POST /api/simulate
# POST /api/analyze
```

**Check for:**
- [ ] All endpoints return 200/201 (not 500)
- [ ] Response data matches expected structure
- [ ] No type-related errors in server logs
- [ ] Validation works (try invalid data)

---

### 5. **Type Validation Testing** (10 minutes)

**Goal:** Verify generated types work correctly in all contexts

#### Test Type Imports

Check these files import correctly:
- [ ] `server/auth.ts` - Uses `User` from `@shared/generated`
- [ ] `server/routes.ts` - Uses all entity types
- [ ] `server/storage.ts` - Uses Drizzle types internally
- [ ] `client/src/lib/types.ts` - Uses generated types
- [ ] `client/src/components/**/*.tsx` - Uses generated types

#### Test Type Compatibility

- [ ] DrizzleUser ↔ GeneratedUser conversions work
- [ ] DrizzleProject ↔ GeneratedProject conversions work
- [ ] DrizzleModel ↔ GeneratedModel conversions work
- [ ] DrizzleScenario ↔ GeneratedScenario conversions work

#### Test Optional/Null Handling

- [ ] Optional fields work (description, displayName, etc.)
- [ ] Null values handled correctly
- [ ] Undefined vs null handled correctly

---

### 6. **Edge Cases & Error Handling** (10 minutes)

**Goal:** Test error scenarios

- [ ] Create project with missing required fields → Should show validation error
- [ ] Create model without nodes/edges → Should handle gracefully
- [ ] Create scenario with invalid modelId → Should show error
- [ ] Run simulation with invalid data → Should show error
- [ ] Delete project with models → Should cascade delete (or show error)
- [ ] Delete model with scenarios → Should cascade delete (or show error)
- [ ] Access non-existent resource → Should show 404

---

### 7. **Database Consistency** (5 minutes)

**Goal:** Verify database operations work correctly

```bash
# Check database directly (if using PostgreSQL)
# Or check in-memory storage behavior
```

- [ ] Data persists correctly
- [ ] Foreign key relationships work
- [ ] Timestamps (createdAt, updatedAt) set correctly
- [ ] JSON fields (nodes, edges, results) stored correctly

---

## Automated Testing Recommendations

### Current State
- ❌ No test files exist
- ❌ No test framework configured
- ✅ TypeScript compilation check (`npm run check`)

### Recommended Test Setup

#### 1. **Unit Tests** (High Priority)

**Framework:** Vitest (works well with Vite/TypeScript)

```bash
npm install -D vitest @vitest/ui
```

**Test Files to Create:**
- `server/__tests__/storage.test.ts` - Test storage operations
- `server/__tests__/types.test.ts` - Test type conversions
- `shared/__tests__/generated.test.ts` - Test generated types

**Example Test:**
```typescript
import { describe, it, expect } from 'vitest';
import { User } from '@shared/generated';

describe('Generated Types', () => {
  it('should import User type correctly', () => {
    const user: User = {
      id: 1,
      username: 'test',
      password: 'hash',
      displayName: 'Test User',
      role: 'user'
    };
    expect(user.username).toBe('test');
  });
});
```

#### 2. **API Integration Tests** (Medium Priority)

**Framework:** Supertest + Vitest

```bash
npm install -D supertest @types/supertest
```

**Test Files:**
- `server/__tests__/api/users.test.ts`
- `server/__tests__/api/projects.test.ts`
- `server/__tests__/api/models.test.ts`
- `server/__tests__/api/scenarios.test.ts`

**Example Test:**
```typescript
import request from 'supertest';
import { app } from '../index';

describe('POST /api/projects', () => {
  it('should create project with generated types', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Test Project', description: 'Test' });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Test Project');
  });
});
```

#### 3. **E2E Tests** (Low Priority - Future)

**Framework:** Playwright or Cypress

**Test Critical Flows:**
- Complete user registration → project → model → scenario → simulation flow
- Verify all UI interactions work with generated types

---

## Testing Checklist Summary

### Pre-Testing Setup
- [ ] All services running (`./dev.sh start`)
- [ ] Database connected (PostgreSQL or in-memory)
- [ ] Browser console open (F12)
- [ ] Server logs visible

### Critical Tests (Must Pass)
- [ ] ✅ TypeScript compiles (`npm run check`)
- [ ] ✅ Application starts without errors
- [ ] ✅ User can log in/register
- [ ] ✅ User can create project
- [ ] ✅ User can create model with nodes/edges
- [ ] ✅ User can create scenario
- [ ] ✅ User can run simulation
- [ ] ✅ User can view results
- [ ] ✅ Data persists after refresh

### Type-Specific Tests
- [ ] ✅ All entity types import correctly
- [ ] ✅ API endpoints accept generated types
- [ ] ✅ Database operations work with Drizzle types
- [ ] ✅ Type conversions work (Drizzle ↔ Generated)

### Edge Cases
- [ ] ✅ Validation errors show correctly
- [ ] ✅ Null/undefined handled correctly
- [ ] ✅ Optional fields work
- [ ] ✅ Error responses formatted correctly

---

## Known Issues to Watch For

### Pre-Existing Issues (Not Migration-Related)
1. **server/vite.ts** - Vite config type error (unrelated)
2. **client/src/components/scenario/ScenarioSelector.tsx** - Type mismatch
3. **client/src/hooks/useFCM.ts** - Incomplete object types

### Migration-Specific Issues to Watch
1. **Null vs Undefined** - Generated types use `null`, manual used `undefined`
2. **Optional Fields** - Generated types make more fields optional
3. **Index Signatures** - Generated types include `[k: string]: unknown`

---

## If Tests Fail

### Type Errors
1. Check if error is pre-existing (see Known Issues)
2. If new, check type imports in affected file
3. Verify generated type matches expected structure
4. Check Drizzle ↔ Generated type conversions

### Runtime Errors
1. Check server logs for detailed error
2. Check browser console for client errors
3. Verify database connection
4. Check API endpoint responses

### Data Issues
1. Verify database schema matches Drizzle schema
2. Check JSON field serialization/deserialization
3. Verify foreign key relationships

---

## Success Criteria

### Minimum (Must Pass)
- ✅ All critical tests pass
- ✅ No new TypeScript errors
- ✅ Complete user workflow works
- ✅ Data persists correctly

### Ideal (Should Pass)
- ✅ All tests pass
- ✅ Edge cases handled
- ✅ Error messages clear
- ✅ Performance acceptable

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Commit Phase 3C migration
2. Proceed to Phase 3D (Cleanup)
   - Remove legacy type files
   - Update documentation
   - Final validation

### If Tests Fail ❌
1. Document failures
2. Fix type compatibility issues
3. Re-test affected areas
4. Proceed when critical tests pass

---

## Quick Test Script

Save this as `test-quick.sh`:

```bash
#!/bin/bash

echo "🧪 Quick Phase 3C Test"
echo ""

echo "1. TypeScript Check..."
npm run check
echo ""

echo "2. Services Status..."
# Check if services are running
curl -s http://localhost:3000/api/user > /dev/null && echo "✅ Express running" || echo "❌ Express not running"
curl -s http://localhost:5050/api/health > /dev/null && echo "✅ Python running" || echo "❌ Python not running"
curl -s http://localhost:5173 > /dev/null && echo "✅ Vite running" || echo "❌ Vite not running"
echo ""

echo "3. Manual Testing Required:"
echo "   - Open http://localhost:5173"
echo "   - Test: Login → Project → Model → Scenario → Simulation"
echo "   - Check browser console for errors"
echo ""

echo "✅ Quick test complete!"
```

---

## Questions?

If you encounter issues during testing:
1. Check server logs (`server/app.log` or console)
2. Check browser console (F12)
3. Verify database connection
4. Review type imports in affected files

**Ready to test?** Start with the Quick Smoke Test, then proceed through the checklist!

