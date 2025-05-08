import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set the Python service URL for API communication
const pythonPort = 5050;
process.env.PYTHON_SIM_URL = `http://localhost:${pythonPort}`;
process.env.PYTHON_SIM_PORT = pythonPort.toString();

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

(async () => {
  const server = await registerRoutes(app);

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

  // Start the server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Expecting Python service at ${process.env.PYTHON_SIM_URL}`);
  });
  
  // Handle cleanup on exit
  const exitHandler = () => {
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
