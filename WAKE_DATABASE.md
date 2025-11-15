# How to Wake Up Your Render Database

## Quick Steps

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Log in with your account

2. **Find Your Database**
   - Look for a PostgreSQL service named something like:
     - `mettamodeler_db`
     - `mettamodeler-db`
     - Or check the database name from your `.env` file: `mettamodeler_db`

3. **Wake the Database**
   - Click on the database service
   - Look for a "Resume" or "Wake" button (if paused)
   - Or click "Restart" if it's in a stopped state
   - Wait 1-2 minutes for it to fully start

4. **Verify It's Running**
   - The status should show "Live" or "Running"
   - You should see a green indicator

5. **Test the Connection**
   - Go back to your app: http://localhost:5173
   - Try registering a new user
   - It should work now!

## Database Connection Info

From your `.env` file:
- **Host:** `dpg-d0fog6i4d50c73f4kpmg-a.virginia-postgres.render.com`
- **Database:** `mettamodeler_db`
- **User:** `mettamodeler_db_user`

## If You Can't Find the Database

1. Check your Render account - make sure you're logged into the correct account
2. Look in "All Services" - the database might be in a different project
3. Check the database URL in `.env` - the service name should match what's in Render

## Alternative: Test Without Database

If you want to test locally without the database, you can temporarily use in-memory storage. However, this requires code changes and data won't persist.

## Troubleshooting

- **Database won't wake up:** Check your Render plan - free tier databases may have limitations
- **Connection still fails:** Wait a few more minutes after waking, databases can take time to fully start
- **Can't access Render:** Make sure you have the right account credentials

