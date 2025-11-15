# Fix Supabase Connection

## The Problem
The hostname `db.cjhnlndvjzpxnaedwwof.supabase.co` doesn't exist in DNS.

## How to Get the Correct Connection String

### Step 1: Check Your Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Make sure you're in the correct project
3. Check the URL - it should show: `https://supabase.com/dashboard/project/[PROJECT-REF]`

### Step 2: Get the Actual Connection String
1. Click **Settings** (gear icon) → **Database**
2. Scroll to **Connection string** section
3. Click the **URI** tab
4. **Copy the ENTIRE string** - it should look like one of these:

**Format 1 (Direct):**
```
postgresql://postgres.xxxxx:zMqj6mxOaFRIUCDb@db.xxxxx.supabase.co:5432/postgres
```

**Format 2 (Pooler - try this if direct doesn't work):**
```
postgresql://postgres.xxxxx:zMqj6mxOaFRIUCDb@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Step 3: Verify Project Reference
- The project reference in the connection string should match what's in your dashboard URL
- If they don't match, use the one from the dashboard

## Quick Check
- Is your project status "Active"?
- Does the project reference in the URL match `cjhnlndvjzpxnaedwwof`?
- If not, that's the issue - use the correct project reference!

