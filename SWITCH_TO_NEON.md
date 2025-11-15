# Quick Switch to Neon Database

Since Supabase isn't resolving, let's use Neon instead (also free and often faster to set up).

## Steps

1. **Go to Neon**: https://neon.tech
2. **Sign up** (free, GitHub login works)
3. **Create a new project**:
   - Click "Create Project"
   - Choose a name (e.g., "mettamodeler")
   - Select a region (closest to you)
   - Click "Create Project"
4. **Get connection string**:
   - After project creation, you'll see a connection string
   - It looks like: `postgresql://[user]:[password]@[host]/[database]?sslmode=require`
   - Copy the entire string
5. **Share it with me** and I'll update everything!

## Neon Benefits
- ✅ Usually provisions faster than Supabase
- ✅ Free tier with 3GB storage
- ✅ Serverless (auto-scales)
- ✅ Works great with Drizzle ORM

## Time Estimate
- Sign up: 1 minute
- Create project: 30 seconds
- Get connection string: Instant
- **Total: ~2 minutes**

Once you have the Neon connection string, I'll:
1. Update `.env` file
2. Run database migrations
3. Restart services
4. Test registration

Ready to try Neon?

