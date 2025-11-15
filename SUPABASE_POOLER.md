# Use Supabase Session Pooler

## The Issue
The direct connection shows "Not IPv4 compatible" - this is why the hostname doesn't resolve.

## Solution: Use Session Pooler

In your Supabase dashboard:

1. **In the "Connect to your project" modal:**
   - Keep "Type" as "URI"
   - Keep "Source" as "Primary Database"  
   - **Change "Method" to "Session Pooler"** (instead of "Direct connection")

2. **Copy the Session Pooler connection string:**
   - It will look like: `postgresql://postgres.cjhnlndvjzpxnaedwwof:zMqj6mxOaFRIUCDb@aws-0-[region].pooler.supabase.com:6543/postgres`
   - The hostname will be different (pooler.supabase.com instead of db.xxx.supabase.co)
   - Port will be 6543 instead of 5432

3. **Share that connection string with me** and I'll update everything!

## Why Session Pooler?
- ✅ IPv4 compatible
- ✅ Works with your network
- ✅ Better for server applications
- ✅ Same database, just different connection method

