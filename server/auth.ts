import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as DrizzleUser } from "@shared/schema";
import { User as GeneratedUser } from "@shared/generated";

// Use generated User type for Express.User (API responses)
// Drizzle User type is still used for database operations
declare global {
  namespace Express {
    interface User extends GeneratedUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

export function setupAuth(app: Express) {
  // Create a secure random string for session secret if not provided
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
    proxy: true // Trust the reverse proxy
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const drizzleUser = await storage.getUserByUsername(username);
        if (!drizzleUser || !(await comparePasswords(password, drizzleUser.password))) {
          return done(null, false);
        }
        // Convert DrizzleUser to GeneratedUser (they're compatible)
        const user: GeneratedUser = {
          id: drizzleUser.id,
          username: drizzleUser.username,
          password: drizzleUser.password,
          displayName: drizzleUser.displayName,
          role: drizzleUser.role || undefined,
        };
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id!));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const drizzleUser = await storage.getUser(id);
      if (!drizzleUser) {
        return done(null, null);
      }
      // Convert DrizzleUser to GeneratedUser
      const user: GeneratedUser = {
        id: drizzleUser.id,
        username: drizzleUser.username,
        password: drizzleUser.password,
        displayName: drizzleUser.displayName,
        role: drizzleUser.role || undefined,
      };
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Register auth routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, displayName } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Create user with hashed password
      const hashedPassword = await hashPassword(password);
      const drizzleUser = await storage.createUser({
        username,
        password: hashedPassword,
        displayName: displayName || null,
        role: "user",
      });

      // Convert DrizzleUser to GeneratedUser for API response
      const user: GeneratedUser = {
        id: drizzleUser.id,
        username: drizzleUser.username,
        password: drizzleUser.password,
        displayName: drizzleUser.displayName,
        role: drizzleUser.role || undefined,
      };

      // Log in the new user
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: DrizzleUser) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as GeneratedUser;
    res.json(userWithoutPassword);
  });
}