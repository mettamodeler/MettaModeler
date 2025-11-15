# Railway Database Setup Guide

This guide will walk you through adding a PostgreSQL database to your Railway deployment.

## Step 1: Add PostgreSQL Database in Railway

1. **Go to your Railway project dashboard**
   - Open your MettaModeler project in Railway

2. **Add PostgreSQL service**
   - Click **"+ New"** button
   - Select **"Database"** → **"Add PostgreSQL"**
   - Railway will automatically provision a PostgreSQL database

3. **Get the Database URL**
   - Click on the PostgreSQL service
   - Go to the **"Variables"** tab
   - Railway automatically creates a `DATABASE_URL` variable
   - **Copy this value** - you'll need it for your main service

## Step 2: Connect Database to Your Main Service

1. **Go to your main service** (the Node.js service)
   - Click on your main service in Railway

2. **Add DATABASE_URL environment variable**
   - Go to the **"Variables"** tab
   - Click **"+ New Variable"**
   - Name: `DATABASE_URL`
   - Value: Copy the `DATABASE_URL` from the PostgreSQL service
   - Click **"Add"**

   **Note:** Railway can also auto-inject this if you use the "Connect" feature:
   - In the PostgreSQL service, click **"Connect"**
   - Select your main service
   - Railway will automatically add `DATABASE_URL` to your service

## Step 3: Update Other Environment Variables

Make sure your main service has these environment variables set:

```
NODE_ENV=production
DATABASE_URL=<from PostgreSQL service>
SESSION_SECRET=<generate a strong random string>
PYTHON_SIM_URL=http://localhost:5050
```

**To generate SESSION_SECRET:**
```bash
openssl rand -base64 32
```

## Step 4: Run Database Migrations

You have two options:

### Option A: Run Migrations Locally (Recommended for first setup)

1. **Get the External Database URL**
   - In Railway PostgreSQL service → Variables
   - Copy the `DATABASE_URL` (this is the external URL)

2. **Run migrations locally**
   ```bash
   # Set the DATABASE_URL temporarily
   export DATABASE_URL="<your-railway-database-url>"
   
   # Run migrations
   npm run db:migrate
   ```

   Or in one command:
   ```bash
   DATABASE_URL="<your-railway-database-url>" npm run db:migrate
   ```

### Option B: Run Migrations in Railway (After deployment)

1. **Add a migration script to package.json** (already done)
   - The `db:migrate` script is configured

2. **Run migrations via Railway CLI** (if you have it installed):
   ```bash
   railway run npm run db:migrate
   ```

3. **Or add a one-time migration service:**
   - Create a temporary service in Railway
   - Set the start command to: `npm run db:migrate`
   - Deploy it once, then delete it

## Step 5: Verify Database Connection

1. **Check your service logs** in Railway
   - Go to your main service → Logs
   - Look for any database connection errors

2. **Test the application**
   - Try creating a user account
   - Try creating a project
   - If these work, your database is connected!

## Troubleshooting

### Issue: "DATABASE_URL is not defined"
- **Solution:** Make sure you've added `DATABASE_URL` to your service's environment variables

### Issue: "SSL connection required"
- **Solution:** Railway PostgreSQL requires SSL. The code already handles this with `ssl: { rejectUnauthorized: false }` in `server/db.ts`

### Issue: "Migration failed"
- **Solution:** 
  - Check that `DATABASE_URL` is correct
  - Verify the database service is running
  - Check the migration script path is correct (`server/migrations`)

### Issue: "Connection timeout"
- **Solution:**
  - Make sure you're using the internal `DATABASE_URL` (not external)
  - Railway services can connect to each other via internal networking
  - The `DATABASE_URL` from the PostgreSQL service should work automatically

## Next Steps

After the database is set up:

1. ✅ Database is provisioned
2. ✅ `DATABASE_URL` is set in your main service
3. ✅ Migrations are run
4. ✅ Application is connected to database
5. 🎉 Your app should be fully functional!

## Railway Database Features

- **Automatic backups:** Railway backs up your database automatically
- **Scaling:** You can scale your database as needed
- **Monitoring:** Check database metrics in the Railway dashboard
- **Connection pooling:** Railway handles connection pooling automatically

## Cost

- Railway's PostgreSQL starts with a free tier
- Check Railway's pricing for database costs
- Free tier is usually sufficient for development/testing

