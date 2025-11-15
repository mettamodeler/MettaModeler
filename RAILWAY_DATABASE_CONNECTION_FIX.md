# Railway Database Connection Fix

## The Problem
You're seeing: `Error: getaddrinfo ENOTFOUND postgres.railway.internal`

This means your app service can't find the database because they're not properly connected.

## The Solution: Use Reference Variables

Railway uses **reference variables** to connect services. You need to reference the database's `DATABASE_URL` in your app service.

## Step-by-Step Fix

### Step 1: Find Your Database Service Name

1. Go to your Railway project dashboard
2. Look at your PostgreSQL service
3. **Note the exact service name** (it might be "PostgreSQL", "postgres", "Database", etc.)
   - The name is case-sensitive!

### Step 2: Connect Using Reference Variable

**Method 1: Use Railway's Connect Button (Easiest)**

1. Click on your **PostgreSQL service**
2. Look for a **"Connect"** button or link
3. Click it and select your main app service
4. Railway will automatically set up the connection

**Method 2: Manually Add Reference Variable**

1. Click on your **main app service** (the one running Node.js)
2. Go to the **"Variables"** tab
3. Click **"+ New Variable"**
4. **Name:** `DATABASE_URL`
5. **Value:** `${{ YOUR_DB_SERVICE_NAME.DATABASE_URL }}`
   
   Replace `YOUR_DB_SERVICE_NAME` with your actual database service name.
   
   Examples:
   - If your service is named "PostgreSQL": `${{ PostgreSQL.DATABASE_URL }}`
   - If your service is named "postgres": `${{ postgres.DATABASE_URL }}`
   - If your service is named "Database": `${{ Database.DATABASE_URL }}`

6. Use the **autocomplete dropdown** in Railway's UI to help you find the correct service name
7. Click **"Add"**

### Step 3: Verify the Connection

After adding the variable:

1. You should see `DATABASE_URL` listed as a **"Reference Variable"**
2. It should show the reference syntax: `${{ ServiceName.DATABASE_URL }}`
3. **Deploy your changes** (Railway will prompt you to review and deploy)

### Step 4: Check the Logs

After deployment:

1. Go to your main service → **"Logs"** tab
2. Look for migration messages: "Running migrations..." and "Migrations completed!"
3. If you see connection errors, double-check:
   - The service name is spelled correctly (case-sensitive!)
   - The variable is set as a reference, not a plain value

## Common Mistakes

❌ **Wrong:** Setting `DATABASE_URL` to a plain connection string  
✅ **Right:** Setting `DATABASE_URL` to `${{ ServiceName.DATABASE_URL }}`

❌ **Wrong:** Using wrong service name (case-sensitive!)  
✅ **Right:** Using exact service name as shown in Railway

❌ **Wrong:** Not deploying after adding the variable  
✅ **Right:** Review and deploy the staged changes

## Reference

- [Railway Variables Documentation](https://docs.railway.com/guides/variables#reference-variables)
- Railway uses template syntax: `${{ SERVICE_NAME.VARIABLE_NAME }}`

