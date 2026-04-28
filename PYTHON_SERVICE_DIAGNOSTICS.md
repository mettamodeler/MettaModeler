# Python Service Connection Diagnostics

## Issue
Node.js is trying to connect to Python service via IPv6 (`::1:5050`) instead of IPv4 (`127.0.0.1:5050`), causing `ECONNREFUSED` errors.

## Diagnostic Steps

### 1. Check Railway Deployment Logs

**What to look for:**
- Does the deployment show the latest commit hash?
- Are there any build errors?
- Does `start.sh` show "✅ Python service is ready"?

**How to check:**
1. Go to Railway dashboard → Your service → Deployments
2. Click on the latest deployment
3. Check the "Build Logs" and "Deploy Logs"
4. Look for:
   - `[timestamp] Starting Python Flask service on port 5050...`
   - `[timestamp] ✅ Python service is ready`
   - `[timestamp] Starting Node.js server on port 8080...`
   - `Expecting Python service at http://127.0.0.1:5050` (should NOT say `localhost`)

### 2. Check Environment Variables in Railway

**What to check:**
- Is `PYTHON_SIM_URL` set? If yes, what value?
- Is `PYTHON_PORT` or `PYTHON_SIM_PORT` set?

**How to check:**
1. Railway dashboard → Your service → Variables
2. Look for `PYTHON_SIM_URL` - **DELETE IT if it's set to `http://localhost:5050`**
3. The code will default to `http://127.0.0.1:5050` if not set

### 3. Check Python Service Logs

**What to look for:**
- Is the Python service actually starting?
- Any import errors or crashes?

**How to check:**
1. Railway dashboard → Your service → Logs
2. Look for Python service startup messages
3. Check for errors like:
   - `ModuleNotFoundError`
   - `ImportError`
   - `Permission denied`
   - Port already in use

### 4. Check Node.js Server Logs

**What to look for:**
- What URL is it trying to connect to?
- Is the Python service URL being logged?

**How to check:**
1. Railway dashboard → Your service → Logs
2. Look for: `Expecting Python service at http://...`
3. If it says `localhost`, the new code hasn't deployed yet
4. If it says `127.0.0.1`, but still fails, the Python service isn't running

### 5. Verify the Deployed Code

**What to check:**
- Is the latest commit actually deployed?

**How to check:**
1. Railway dashboard → Your service → Settings → Source
2. Check the commit hash matches your latest push
3. If not, trigger a redeploy

### 6. Test Python Service Directly

**What to check:**
- Can we reach the Python service from within the container?

**How to check:**
1. Railway dashboard → Your service → Settings → Connect
2. SSH into the container (if available)
3. Run: `curl http://127.0.0.1:5050/api/health`
4. Should return: `{"status":"ok"}`

## Common Issues & Fixes

### Issue 1: Environment Variable Override
**Symptom:** Code says `127.0.0.1` but still connects to `localhost`
**Fix:** Delete `PYTHON_SIM_URL` from Railway environment variables

### Issue 2: Python Service Not Starting
**Symptom:** No "✅ Python service is ready" in logs
**Fix:** Check Python logs for errors, verify virtual environment exists

### Issue 3: Old Code Deployed
**Symptom:** Logs show `localhost` instead of `127.0.0.1`
**Fix:** Trigger a new deployment or check if Railway is using cached build

### Issue 4: IPv6 Resolution
**Symptom:** Error shows `::1` (IPv6) even with `127.0.0.1` in code
**Fix:** This shouldn't happen if code uses `127.0.0.1` - indicates old code is running

## Quick Fix Checklist

1. ✅ Delete `PYTHON_SIM_URL` from Railway environment variables (if exists)
2. ✅ Verify latest commit is deployed (check commit hash)
3. ✅ Check deployment logs for Python service startup
4. ✅ Check if Python service health check passes
5. ✅ Verify Node.js logs show `127.0.0.1` not `localhost`

## What Logs to Share

If still having issues, share:
1. **Deployment logs** (from Railway) - especially the startup sequence
2. **Python service logs** - any errors during startup
3. **Node.js server logs** - the line showing "Expecting Python service at..."
4. **Environment variables** (screenshot, redact secrets) - to see if `PYTHON_SIM_URL` is set


