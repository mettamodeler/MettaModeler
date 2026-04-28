# Schema-Migration Sync Issue & Fix

## The Problem

**Error:** `PostgresError: column "nodes" does not exist`

**Root Cause:** Schema drift between `shared/schema.ts` and the database migration.

### What Happened

1. **Schema Definition** (`shared/schema.ts` line 50):
   ```typescript
   nodes: jsonb("nodes").$type<any[]>().default([]),
   ```
   ✅ The schema includes the `nodes` column

2. **Migration SQL** (`server/migrations/0000_quiet_pixie.sql`):
   ```sql
   CREATE TABLE "scenarios" (
     -- ... other columns ...
     -- ❌ MISSING: "nodes" jsonb column
   );
   ```
   ❌ The migration does NOT include the `nodes` column

3. **Database State:**
   - Created from the migration → No `nodes` column exists
   - Code tries to access `scenario.nodes` → **ERROR**

### Why This Happened

The migration was generated **before** the `nodes` column was added to the schema, OR the migration was manually edited and the column was removed. This created a mismatch between:
- **Source of Truth:** `shared/schema.ts` (has `nodes`)
- **Database Schema:** Created from migration (missing `nodes`)

## The Fix

Created a new migration to add the missing column:

**File:** `server/migrations/0001_add_nodes_to_scenarios.sql`
```sql
ALTER TABLE "scenarios" ADD COLUMN "nodes" jsonb DEFAULT '[]'::jsonb;
```

This migration will run automatically on the next deployment.

## Prevention: Single Source of Truth Workflow

### ✅ Correct Workflow

1. **Edit Schema First:** Always modify `shared/schema.ts`
2. **Generate Migration:** Run `npm run db:push` or `drizzle-kit generate`
3. **Review Migration:** Check the generated SQL matches your changes
4. **Test Locally:** Run migrations on local database
5. **Commit Together:** Commit schema + migration files together

### ❌ What NOT to Do

- ❌ Manually edit migration SQL without updating schema
- ❌ Add columns to schema without generating new migration
- ❌ Skip testing migrations locally
- ❌ Commit schema changes without corresponding migrations

### Commands

```bash
# Generate migration from schema changes
npm run db:push

# Or use drizzle-kit directly
npx drizzle-kit generate

# Run migrations
npm run db:migrate
```

## Verification

After deployment, verify the column exists:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scenarios' AND column_name = 'nodes';
```

Should return: `nodes | jsonb`


