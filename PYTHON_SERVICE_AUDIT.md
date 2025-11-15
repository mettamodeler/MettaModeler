# Python Service Startup Audit

## Current Architecture

### Build Process (nixpacks.toml)
1. **Virtual Environment Creation**: `python3 -m venv /app/venv`
   - Creates venv at hardcoded path `/app/venv`
   - Assumes Railway uses `/app` as working directory

2. **Dependency Installation**: 
   - `source /app/venv/bin/activate && pip install -r python_sim/requirements.txt`
   - Dependencies installed ONLY in virtual environment
   - System Python has NO dependencies

### Runtime Process (start.sh)
1. **Python Command Selection**:
   ```bash
   PYTHON_CMD=${VENV_PYTHON:-/app/venv/bin/python3}
   if [ ! -f "$PYTHON_CMD" ]; then
       PYTHON_CMD=python3  # Falls back to system Python
   fi
   ```

2. **Working Directory Change**:
   ```bash
   cd python_sim
   nohup $PYTHON_CMD app.py > ../logs/python.log 2>&1 &
   ```

3. **Background Process**:
   - Runs in background with `nohup` and `&`
   - Errors only visible in log file
   - No immediate feedback if Python crashes

## Critical Issues Identified

### 🔴 Issue #1: Hardcoded Virtual Environment Path
**Problem**: 
- Venv created at `/app/venv` during build
- Railway's working directory might NOT be `/app`
- If path doesn't exist, falls back to system `python3` which has NO dependencies

**Evidence**:
- `start.sh` line 28: `PYTHON_CMD=${VENV_PYTHON:-/app/venv/bin/python3}`
- `nixpacks.toml` line 9: `python3 -m venv /app/venv`

**Impact**: 
- If Railway uses different root (e.g., `/workspace`, `/app/user`, etc.), venv won't be found
- Falls back to system Python → ImportError for all dependencies (flask, numpy, etc.)
- Service crashes immediately on startup

**Likelihood**: **HIGH** - Railway's working directory is not guaranteed to be `/app`

---

### 🔴 Issue #2: Silent Failure on Import Errors
**Problem**:
- Python runs in background with `nohup`
- If Python crashes on import (e.g., `ModuleNotFoundError: No module named 'flask'`), error goes to log file
- Health check might pass if Python process exists but Flask never started
- No immediate visibility into why Python failed

**Evidence**:
- `start.sh` line 38: `nohup $PYTHON_CMD app.py > ../logs/python.log 2>&1 &`
- Log file might not exist if Python crashes before creating it
- Health check only checks HTTP endpoint, not if Python actually started

**Impact**:
- Python process might exist but Flask app never initialized
- Connection refused errors when Node.js tries to connect
- Difficult to debug without checking log file

**Likelihood**: **MEDIUM** - Depends on whether venv path issue occurs

---

### 🔴 Issue #3: Working Directory Dependency
**Problem**:
- Script does `cd python_sim` before running Python
- Python imports are relative: `from simulate import ...`, `from export import ...`
- If working directory is wrong, Python can't find modules
- Python will crash with `ModuleNotFoundError`

**Evidence**:
- `start.sh` line 25: `cd python_sim`
- `app.py` lines 3-4: `from simulate import ...`, `from export import ...`
- These are relative imports that depend on current working directory

**Impact**:
- If `cd python_sim` fails or doesn't work as expected, imports fail
- Python crashes immediately

**Likelihood**: **LOW** - `cd` should work, but could fail if directory doesn't exist

---

### 🟡 Issue #4: Environment Variable Timing
**Problem**:
- `PYTHON_SIM_PORT` is set before running Python
- But it's set in the function scope, not globally
- Background process should inherit it, but worth verifying

**Evidence**:
- `start.sh` line 34: `export PYTHON_SIM_PORT=$PYTHON_PORT`
- `app.py` line 344: `port = int(os.environ.get('PYTHON_SIM_PORT', 5050))`

**Impact**:
- If env var not available, defaults to 5050 (should be fine)
- But if `PYTHON_PORT` is different, Python might bind to wrong port

**Likelihood**: **LOW** - Environment variables should be inherited

---

### 🟡 Issue #5: Log File Location
**Problem**:
- Logs go to `../logs/python.log` (relative to `python_sim/` directory)
- If `logs/` directory doesn't exist, log file might not be created
- Errors might be lost

**Evidence**:
- `start.sh` line 20: `mkdir -p logs` (creates at project root)
- `start.sh` line 38: `nohup ... > ../logs/python.log` (from `python_sim/` directory)
- Path should work, but if `cd python_sim` fails, path is wrong

**Impact**:
- Errors might not be logged if path is wrong
- Makes debugging harder

**Likelihood**: **LOW** - Directory should exist, but path is relative

---

### 🟡 Issue #6: Health Check Timing
**Problem**:
- Health check starts immediately after starting Python
- Python might need time to import modules and start Flask
- 10 retries with 1-second delays = 10 seconds max
- If Python takes longer to start (e.g., slow imports), health check fails

**Evidence**:
- `start.sh` lines 46-56: Health check with 10 retries, 1 second each
- First check happens after 1 second
- Python imports (numpy, networkx, etc.) can be slow

**Impact**:
- False negatives if Python is just slow to start
- Script continues anyway, but might indicate a problem

**Likelihood**: **LOW** - 10 seconds should be enough, but imports can be slow

---

## Root Cause Analysis

### Most Likely Issue: **Virtual Environment Path Mismatch**

**Scenario**:
1. Railway builds the app and creates venv at `/app/venv` ✅
2. Railway runs the app, but working directory is NOT `/app` ❌
3. `start.sh` checks for `/app/venv/bin/python3` → **NOT FOUND** ❌
4. Falls back to system `python3` → **NO DEPENDENCIES** ❌
5. Python tries to import `flask` → **ModuleNotFoundError** ❌
6. Python crashes immediately → **No Flask server** ❌
7. Node.js tries to connect → **ECONNREFUSED** ❌

**Why This Happens**:
- Railway's working directory is not standardized
- Different Railway services might use different root directories
- The hardcoded `/app` path is an assumption that might not hold

---

## Is This a Brittle Build?

### Yes, for these reasons:

1. **Hardcoded Paths**: Assumes `/app` is the working directory
2. **No Fallback for Dependencies**: If venv not found, system Python has no packages
3. **Silent Failures**: Background process hides errors
4. **No Verification**: Doesn't verify Python can actually import required modules before starting
5. **Environment Assumptions**: Assumes Railway's directory structure

### But it works if:
- Railway uses `/app` as working directory ✅
- Virtual environment is created successfully ✅
- All dependencies install correctly ✅
- Python can find the venv at runtime ✅

---

## Recommendations (For Future Fix)

1. **Use `$PWD` or `pwd` instead of hardcoded `/app`**
   - Find the actual working directory
   - Create venv relative to current directory

2. **Verify Python can import before starting**
   - Run `python3 -c "import flask, numpy, networkx"` before starting
   - Fail fast if imports don't work

3. **Better error handling**
   - Check if Python process is actually running (not just exists)
   - Show Python startup errors immediately
   - Don't continue if Python fails to start

4. **Use absolute paths from environment**
   - Railway provides `RAILWAY_WORKING_DIR` or similar
   - Use that instead of hardcoding

5. **Install dependencies in system Python as fallback**
   - Or verify venv exists before using it
   - Don't silently fall back to empty system Python

---

## Diagnostic Steps

To confirm the issue, check Railway logs for:

1. **"Python service started with PID: X"** - Does this appear?
2. **"Python service is ready"** - Does health check pass?
3. **Python log file contents** - What errors are in `logs/python.log`?
4. **Working directory** - What is `pwd` when script runs?
5. **Venv path** - Does `/app/venv/bin/python3` exist?
6. **Python imports** - Can Python import flask/numpy/etc?

The most telling sign: If you see "Python service started" but health check fails, Python is crashing on startup (likely import errors).


