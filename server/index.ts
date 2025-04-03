import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { spawn, ChildProcess } from "child_process";
import path from "path";

// Python simulation service process
let pythonProcess: ChildProcess | null = null;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Function to start the Python simulation service
function startPythonService() {
  // Set the default port for the Python service
  const pythonPort = 5050;
  process.env.PYTHON_SIM_URL = `http://localhost:${pythonPort}`;
  process.env.PYTHON_SIM_PORT = pythonPort.toString();

  log(`Starting Python simulation service on port ${pythonPort}...`);
  
  // Start the Python service
  pythonProcess = spawn('python', ['app.py'], {
    cwd: path.join(process.cwd(), 'python_sim'),
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',  // Force Python to print to stdout without buffering
    }
  });

  // Log Python process output
  pythonProcess.stdout?.on('data', (data) => {
    log(`Python service: ${data.toString().trim()}`, 'python');
  });

  pythonProcess.stderr?.on('data', (data) => {
    log(`Python service error: ${data.toString().trim()}`, 'python');
  });

  pythonProcess.on('close', (code) => {
    log(`Python service exited with code ${code}`, 'python');
    
    // Restart the service if it crashes
    if (code !== 0) {
      setTimeout(() => {
        log('Restarting Python simulation service...', 'python');
        startPythonService();
      }, 5000);
    }
  });
}

(async () => {
  const server = await registerRoutes(app);

  // Start the Python simulation service
  startPythonService();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
  
  // Handle cleanup on exit
  const exitHandler = () => {
    if (pythonProcess) {
      log('Shutting down Python simulation service...', 'python');
      pythonProcess.kill();
      pythonProcess = null;
    }
    process.exit(0);
  };
  
  // Handle SIGINT, SIGTERM, unhandledRejection, and uncaughtException
  process.on('SIGINT', exitHandler);
  process.on('SIGTERM', exitHandler);
  process.on('unhandledRejection', (reason) => {
    log(`Unhandled Rejection: ${reason}`, 'system');
  });
  process.on('uncaughtException', (error) => {
    log(`Uncaught Exception: ${error.message}`, 'system');
    exitHandler();
  });
})();
