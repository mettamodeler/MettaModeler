# Database Setup Options

## Option 1: Supabase (Free Tier) - RECOMMENDED ✅

**Pros:**
- Free tier with 500MB database
- Easy setup
- Good for development
- Similar to Render

**Steps:**
1. Go to https://supabase.com
2. Sign up (free)
3. Create a new project
4. Go to Settings → Database
5. Copy the connection string (URI format)
6. Update your `.env` file with the new `DATABASE_URL`

**Connection String Format:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

## Option 2: Neon (Free Tier) - Also Good

**Pros:**
- Free tier with 3GB database
- Serverless PostgreSQL
- Auto-scaling

**Steps:**
1. Go to https://neon.tech
2. Sign up (free)
3. Create a new project
4. Copy the connection string
5. Update your `.env` file

---

## Option 3: Local PostgreSQL (Free, but requires setup)

**Pros:**
- Completely free
- Full control
- Fast (local)

**Cons:**
- Only works on your machine
- Requires PostgreSQL installation

**Steps:**
1. Install PostgreSQL locally
2. Create a database: `createdb mettamodeler`
3. Update `.env`: `DATABASE_URL=postgresql://localhost/mettamodeler`

---

## Option 4: Upgrade Render (Paid)

**Cost:** ~$7-20/month depending on plan

**Steps:**
1. Go to Render dashboard
2. Upgrade your database service
3. Your existing data will be restored

---

## Quick Migration Guide

Once you have a new database:

1. **Update `.env` file:**
   ```bash
   DATABASE_URL=your_new_connection_string
   ```

2. **Run migrations:**
   ```bash
   npm run db:push
   # or
   cd server && npm run migrate
   ```

3. **Restart services:**
   ```bash
   ./dev.sh restart
   ```

4. **Test registration:**
   - Should work immediately!

---

## Recommendation

For development/testing: **Use Supabase** - it's free, easy, and similar to what you had.

For production later: You can migrate to a paid service when ready.

