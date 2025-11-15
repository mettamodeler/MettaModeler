# Supabase Connection String Guide

## How to Get the Correct Connection String

1. **Go to your Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project

2. **Navigate to Database Settings**
   - Click **Settings** (gear icon) in the left sidebar
   - Click **Database** in the settings menu

3. **Find Connection String**
   - Scroll down to **Connection string** section
   - You'll see multiple options:
     - **URI** - Direct connection
     - **JDBC** - Java connection
     - **Golang** - Go connection
     - **psql** - Command line format

4. **Copy the URI Format**
   - Click on the **URI** tab
   - Copy the connection string
   - It should look like one of these formats:

### Format 1: Direct Connection (Port 5432)
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Format 2: Pooler Connection (Port 6543)
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Format 3: Transaction Pooler (Port 6543)
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Important Notes

- **Replace `[YOUR-PASSWORD]`** with your actual database password
- The **PROJECT-REF** is your unique project identifier
- **Direct connection (5432)** is for server-side connections
- **Pooler connection (6543)** is recommended for serverless/server applications

## For MettaModeler

We need the **Direct connection** format (port 5432) for the server.

The connection string should be:
```
postgresql://postgres:zMqj6mxOaFRIUCDb@db.[PROJECT-REF].supabase.co:5432/postgres
```

## Troubleshooting

If the hostname doesn't resolve:
1. **Check project status** - Make sure the project shows "Active"
2. **Wait a few minutes** - New projects can take 2-3 minutes to fully provision
3. **Verify project reference** - Double-check the project reference in the URL
4. **Try pooler connection** - Sometimes pooler works when direct doesn't

## Current Issue

The hostname `db.cjhnlndvjzpxnaedwwof.supabase.co` is not resolving.

**Please verify:**
1. Is your Supabase project fully created and active?
2. Can you see the connection string in your dashboard?
3. What does the actual connection string show in Supabase? (Copy it exactly)

