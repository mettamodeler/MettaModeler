# Production Deployment Guide for MettaModeler

## 🎯 Production Readiness Audit

### ✅ What's Ready
- [x] Build scripts configured (`npm run build`)
- [x] Production start script (`npm start`)
- [x] Environment variable template (`.env.example`)
- [x] Database migrations setup
- [x] Schema-first architecture complete
- [x] Security: .env files excluded from git
- [x] Log files excluded from git

### ✅ Issues Fixed

1. **`start.sh` script** ✅ FIXED
   - ✅ Now uses Flask (not uvicorn)
   - ✅ Removed incorrect `client/npm start` reference
   - ✅ Properly starts Python Flask service in background
   - ✅ Starts Node.js server in foreground
   - ✅ Includes health check for Python service

2. **Build process** ✅ FIXED
   - ✅ Build script updated to copy `dist/public/` → `server/public/`
   - ✅ Server can now find static files in production
   - ✅ Build tested and verified working

3. **Python service startup** ✅ READY
   - ✅ Flask configured correctly
   - ✅ Port configuration uses `PYTHON_SIM_PORT` environment variable
   - ✅ Binds to `0.0.0.0` for production

### ⚠️ Still Need Before Deployment

1. **Database connection**
   - Need production database URL (set up on deployment platform)
   - SSL configuration for production (handled by `server/db.ts`)

2. **Session security**
   - Need strong `SESSION_SECRET` for production (generate before deployment)
   - Cookie security settings verified (already configured in `server/auth.ts`)

---

## 🚀 Deployment Options

### Option 1: Render.com (Recommended for Full-Stack)

**Pros:**
- Supports both Node.js and Python services
- Free tier available
- Easy GitHub integration
- Built-in PostgreSQL database option

**Steps:**

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create PostgreSQL Database**
   - Dashboard → New → PostgreSQL
   - Name: `mettamodeler-db`
   - Region: Choose closest to users
   - Copy the **Internal Database URL** (for service-to-service)
   - Copy the **External Database URL** (for migrations)

3. **Create Web Service (Main App)**
   - Dashboard → New → Web Service
   - Connect GitHub repo
   - Settings:
     ```
     Name: mettamodeler
     Environment: Node
     Region: Same as database
     Branch: feature/express-migration (or main)
     Root Directory: ./
     Build Command: npm install && npm run build
     Start Command: node dist/index.js
     ```
   - Environment Variables:
     ```
     NODE_ENV=production
     PORT=10000
     DATABASE_URL=<Internal Database URL from step 2>
     SESSION_SECRET=<Generate strong random string>
     PYTHON_SIM_URL=http://localhost:5050
     ```

4. **Create Background Worker (Python Service)**
   - Dashboard → New → Background Worker
   - Settings:
     ```
     Name: mettamodeler-python
     Environment: Python 3
     Region: Same as main service
     Branch: feature/express-migration (or main)
     Root Directory: ./python_sim
     Build Command: pip install -r requirements.txt
     Start Command: python app.py
     ```
   - Environment Variables:
     ```
     FLASK_ENV=production
     PORT=5050
     ```

5. **Update Python Service URL**
   - In main service, set `PYTHON_SIM_URL` to the Python service's URL
   - Format: `https://mettamodeler-python.onrender.com`

6. **Run Database Migrations**
   ```bash
   # Locally, using external database URL
   DATABASE_URL=<External Database URL> npm run db:push
   ```

---

### Option 2: Railway.app

**Pros:**
- Very simple setup
- Auto-detects services
- Free tier available

**Steps:**

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - New Project → Deploy from GitHub repo
   - **Important:** Railway defaults to `main` branch
   - If deploying from `feature/express-migration`:
     - Go to Project Settings → Source
     - Change branch to `feature/express-migration`
   - **Fix for "Error creating build plan with Railpack":**
     - Railway may fail to auto-detect the monorepo structure
     - The `nixpacks.toml` file has been created to fix this
     - If it still fails, manually configure the service:
       - Build Command: `npm install && cd python_sim && pip install -r requirements.txt && cd .. && npm run build`
       - Start Command: `chmod +x start.sh && ./start.sh`

3. **Add PostgreSQL**
   - New → Database → PostgreSQL
   - Railway provides `DATABASE_URL` automatically

4. **Configure Services**
   - Railway will create services for Node.js and Python
   - **Main Service (Node.js):**
     - Build Command: `npm install && npm run build`
     - Start Command: `node dist/index.js`
     - Root Directory: `.` (root)
   - **Python Service:**
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `python app.py`
     - Root Directory: `python_sim`
   - Set environment variables in each service:
     - **Node.js service:**
       ```
       NODE_ENV=production
       PORT=<Railway assigns automatically>
       DATABASE_URL=<from PostgreSQL service>
       SESSION_SECRET=<generate strong random string>
       PYTHON_SIM_URL=<Python service's private URL>
       ```
     - **Python service:**
       ```
       FLASK_ENV=production
       PORT=5050
       PYTHON_SIM_PORT=5050
       ```
   - Railway handles service discovery automatically
   - Use Railway's service URL for `PYTHON_SIM_URL` (internal networking)

---

### Option 3: Fly.io

**Pros:**
- Global edge deployment
- Good for scaling
- Free tier available

**Steps:**

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create Fly App**
   ```bash
   fly launch
   ```

3. **Configure `fly.toml`** (see below)

4. **Deploy**
   ```bash
   fly deploy
   ```

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

Create `.env.production` template:

```bash
# Production Environment Variables
NODE_ENV=production
PORT=10000

# Database (use Render/Railway provided URL)
DATABASE_URL=postgresql://user:password@host:port/database

# Session Security (GENERATE A STRONG RANDOM STRING)
SESSION_SECRET=your-very-long-random-secret-here-minimum-32-characters

# Python Service URL (update after Python service is deployed)
PYTHON_SIM_URL=http://localhost:5050
# Or for separate service:
# PYTHON_SIM_URL=https://mettamodeler-python.onrender.com
```

### 3. Build Verification

Test the build locally:

```bash
# Clean previous builds
rm -rf dist server/public

# Build
npm run build

# Verify build output
ls -la dist/
ls -la server/public/

# Test production start (locally)
NODE_ENV=production node dist/index.js
```

### 4. Database Setup

```bash
# Run migrations
DATABASE_URL=<your-production-db-url> npm run db:push

# Or use Drizzle Kit
DATABASE_URL=<your-production-db-url> npx drizzle-kit push
```

### 5. Security Checklist

- [ ] Strong `SESSION_SECRET` (32+ random characters)
- [ ] Database uses SSL in production
- [ ] CORS configured correctly
- [ ] No sensitive data in code
- [ ] Environment variables set in hosting platform
- [ ] HTTPS enabled (automatic on most platforms)

---

## 🔧 Platform-Specific Configuration

### Render.com

**render.yaml** (optional, for infrastructure as code):

```yaml
services:
  - type: web
    name: mettamodeler
    env: node
    buildCommand: npm install && npm run build
    startCommand: node dist/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: mettamodeler-db
          property: connectionString
      - key: SESSION_SECRET
        generateValue: true
      - key: PYTHON_SIM_URL
        fromService:
          name: mettamodeler-python
          type: web
          property: host

  - type: worker
    name: mettamodeler-python
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python app.py
    envVars:
      - key: FLASK_ENV
        value: production
      - key: PORT
        value: 5050

databases:
  - name: mettamodeler-db
    plan: free
```

### Railway.app

**railway.json** (optional):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Fly.io

**fly.toml**:

```toml
app = "mettamodeler"
primary_region = "iad"

[build]

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"
  script_checks = []
```

---

## 🧪 Post-Deployment Testing

1. **Health Check**
   ```bash
   curl https://your-app-url.onrender.com/api/health
   ```

2. **Test User Registration**
   - Create a test account
   - Verify database persistence

3. **Test Simulation**
   - Create a model
   - Run a simulation
   - Verify Python service communication

4. **Check Logs**
   - Monitor application logs
   - Check for errors
   - Verify all services running

---

## 📊 Monitoring & Maintenance

### Logs
- Render: Dashboard → Logs tab
- Railway: Dashboard → Deployments → View Logs
- Fly: `fly logs`

### Metrics
- Monitor CPU, Memory, Network usage
- Set up alerts for errors
- Track response times

### Updates
1. Push changes to GitHub
2. Platform auto-deploys (if configured)
3. Monitor deployment logs
4. Test after deployment

---

## 🐛 Troubleshooting

### Build Fails
- Check Node.js version (needs 16+)
- Verify all dependencies install
- Check build logs for specific errors

### Service Won't Start
- Verify environment variables set
- Check port configuration
- Review application logs

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check SSL requirements
- Ensure database is accessible from service

### Python Service Not Responding
- Verify Python service is running
- Check `PYTHON_SIM_URL` is correct
- Review Python service logs
- Test Python service directly

---

## 🎉 Next Steps After Deployment

1. **Set up custom domain** (optional)
2. **Configure SSL** (automatic on most platforms)
3. **Set up monitoring/alerts**
4. **Create backup strategy**
5. **Document API endpoints**
6. **Set up CI/CD** (GitHub Actions)

---

## 📝 Quick Start Commands

```bash
# 1. Build locally to test
npm run build

# 2. Test production build
NODE_ENV=production node dist/index.js

# 3. Run database migrations
DATABASE_URL=<prod-url> npm run db:push

# 4. Deploy (platform-specific)
# Render: Push to GitHub (auto-deploys)
# Railway: Push to GitHub (auto-deploys)
# Fly: fly deploy
```

---

## ⚠️ Important Notes

1. **Never commit `.env` files** - Use platform environment variables
2. **Generate strong `SESSION_SECRET`** - Use: `openssl rand -base64 32`
3. **Use production database** - Don't use local/dev database
4. **Test thoroughly** - Test all features after deployment
5. **Monitor closely** - Watch logs for first few days

---

## 🆘 Need Help?

- Check platform documentation
- Review application logs
- Test locally with production-like settings
- Verify all environment variables are set

