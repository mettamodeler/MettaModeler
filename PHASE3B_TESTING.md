# Phase 3B Testing Checklist

**Date:** November 14, 2025  
**Status:** Pre-Phase 3C Validation

## What We Changed

1. **Created `shared/generated.ts`** - Re-exports generated types
2. **Updated imports** - 7 files now import from `@shared/generated`
3. **Removed manual types** - FCMNode, FCMEdge, SimulationNode, etc. now come from JSON Schema

## Testing Checklist

### ✅ Compilation Check
- [ ] TypeScript compiles without errors
- [ ] No type mismatches between generated and manual types

### ✅ Runtime Check
- [ ] Application starts successfully
- [ ] All services running (Express, Python, Vite)

### ✅ Basic Functionality
- [ ] User can log in/register
- [ ] User can create a project
- [ ] User can create a model with nodes/edges
- [ ] User can create a scenario
- [ ] User can run a simulation
- [ ] User can view simulation results

### ✅ Type Compatibility
- [ ] FCMNode types work in FCMEditor
- [ ] FCMEdge types work in FCMEditor
- [ ] SimulationNode types work in scenario components
- [ ] SimulationResult types work in comparison views
- [ ] API routes accept correct types
- [ ] Database storage works with generated types

### ✅ Edge Cases
- [ ] Null/undefined handling (generated types allow null, manual didn't)
- [ ] Optional fields work correctly
- [ ] Index signatures don't break existing code

## Known Issues

1. **TypeScript Errors:** Some pre-existing errors remain (unrelated to migration)
2. **Null vs Undefined:** Generated types use `string | null` vs manual `string | undefined`
   - May need type guards or conversions in some places

## Test Results

### Compilation
```bash
npm run check
```
**Status:** [ ] Pass / [ ] Fail

### Runtime
```bash
./dev.sh start
# Then test in browser
```
**Status:** [ ] Pass / [ ] Fail

### Manual Testing
- [ ] Login works
- [ ] Create project works
- [ ] Create model works
- [ ] Create scenario works
- [ ] Run simulation works
- [ ] View results works

## Next Steps

If all tests pass:
- ✅ Proceed to Phase 3C (Migrate entities)

If tests fail:
- ⚠️ Fix type compatibility issues
- ⚠️ Add type guards/conversions where needed
- ⚠️ Re-test before proceeding

