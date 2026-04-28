import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as DrizzleUser } from "@shared/schema";
import { User as GeneratedUser } from "@shared/generated";
import { registrationLimiter, loginLimiter } from "./middleware/rateLimit";
import { registerSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema } from "./validation/auth";
import { generateTokenWithExpiration } from "./utils/tokens";
import {
  sendPasswordResetEmail,
  sendSecurityAlertEmail,
  sendVerificationEmail,
  validateEmailConfiguration,
} from "./services/email";

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
  // Require SESSION_SECRET in production
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET must be set in production. Generate a secure random string and set it as an environment variable."
    );
  }
  
  // Create a secure random string for session secret if not provided (development only)
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
  
  if (process.env.NODE_ENV !== "production") {
    console.warn("⚠️  WARNING: Using auto-generated SESSION_SECRET. Set SESSION_SECRET environment variable for production.");
  }

  validateEmailConfiguration();
  
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
        
        // Check if account is locked
        if (drizzleUser?.lockedUntil) {
          const now = new Date();
          if (drizzleUser.lockedUntil > now) {
            // Account is still locked
            return done(null, false);
          } else {
            // Lock expired, reset failed attempts
            await storage.updateUser(drizzleUser.id!, {
              failedLoginAttempts: 0,
              lockedUntil: null,
            });
          }
        }
        
        if (!drizzleUser || !(await comparePasswords(password, drizzleUser.password))) {
          // Increment failed login attempts
          if (drizzleUser) {
            const failedAttempts = (drizzleUser.failedLoginAttempts || 0) + 1;
            const maxAttempts = 5;
            const lockDurationMinutes = 30;
            
            if (failedAttempts >= maxAttempts) {
              // Lock account for 30 minutes
              const lockedUntil = new Date();
              lockedUntil.setMinutes(lockedUntil.getMinutes() + lockDurationMinutes);
              
              await storage.updateUser(drizzleUser.id!, {
                failedLoginAttempts: failedAttempts,
                lockedUntil,
              });

              if (drizzleUser.email) {
                try {
                  await sendSecurityAlertEmail(drizzleUser.email, "account_locked");
                } catch (emailError) {
                  console.error("Failed to send account lock alert:", emailError);
                }
              }
            } else {
              await storage.updateUser(drizzleUser.id!, {
                failedLoginAttempts: failedAttempts,
              });
            }
          }
          return done(null, false);
        }
        
        // Successful login - reset failed attempts
        if (drizzleUser.failedLoginAttempts && drizzleUser.failedLoginAttempts > 0) {
          await storage.updateUser(drizzleUser.id!, {
            failedLoginAttempts: 0,
            lockedUntil: null,
          });
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
  app.post("/api/register", registrationLimiter, async (req, res, next) => {
    try {
      // Validate input with Zod schema
      const validationResult = registerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }

      const { username, email, password, displayName } = validationResult.data;
      
      // Check if user already exists (use generic error to prevent username enumeration)
      const existingUser = await storage.getUserByUsername(username);
      const existingEmail = email ? await storage.getUserByEmail(email) : null;
      
      if (existingUser || existingEmail) {
        // Generic error message to prevent username/email enumeration
        return res.status(400).json({
          error: "Registration failed. Please check your input and try again."
        });
      }

      // Generate email verification token
      const { token: verificationToken, expiresAt } = await generateTokenWithExpiration(24); // 24 hours

      // Create user with hashed password
      const hashedPassword = await hashPassword(password);
      const drizzleUser = await storage.createUser({
        username,
        email: email || null,
        password: hashedPassword,
        displayName: displayName || null,
        role: "user",
        emailVerified: "false",
        emailVerificationToken: verificationToken,
        emailVerificationExpires: expiresAt,
      });
      
      try {
        await sendVerificationEmail(email, verificationToken);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }

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

  app.post("/api/login", loginLimiter, (req, res, next) => {
    // Validate input with Zod schema
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    passport.authenticate("local", (err: Error, user: DrizzleUser) => {
      if (err) return next(err);
      if (!user) {
        // Generic error message to prevent username enumeration
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      // Regenerate session ID on successful login (session fixation protection)
      req.session.regenerate((err) => {
        if (err) return next(err);
        
        req.login(user, (err) => {
          if (err) return next(err);
          // Return user without password
          const { password, ...userWithoutPassword } = user;
          res.status(200).json(userWithoutPassword);
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Email verification endpoint
  app.post("/api/verify-email", async (req, res, next) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const user = await storage.getUserByVerificationToken(token);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      // Check if token is expired
      if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
        return res.status(400).json({ error: "Verification token has expired" });
      }

      // Check if already verified
      if (user.emailVerified === "true") {
        return res.status(400).json({ error: "Email is already verified" });
      }

      // Verify email
      await storage.updateUser(user.id!, {
        emailVerified: "true",
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      res.status(200).json({ message: "Email verified successfully" });
    } catch (err) {
      next(err);
    }
  });

  // Resend verification email
  app.post("/api/resend-verification", async (req, res, next) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      // Don't reveal if email exists (prevent enumeration)
      if (!user) {
        return res.status(200).json({ message: "If an account exists with this email, a verification link has been sent" });
      }

      if (user.emailVerified === "true") {
        return res.status(400).json({ error: "Email is already verified" });
      }

      // Generate new verification token
      const { token: verificationToken, expiresAt } = await generateTokenWithExpiration(24);
      
      await storage.updateUser(user.id!, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: expiresAt,
      });

      try {
        await sendVerificationEmail(email, verificationToken);
      } catch (emailError) {
        // Preserve enumeration-safe response contract.
        console.error("Failed to resend verification email:", emailError);
      }

      res.status(200).json({ message: "If an account exists with this email, a verification link has been sent" });
    } catch (err) {
      next(err);
    }
  });

  // Request password reset
  app.post("/api/forgot-password", async (req, res, next) => {
    try {
      const validationResult = passwordResetRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }

      const { email } = validationResult.data;
      const user = await storage.getUserByEmail(email);
      
      // Don't reveal if email exists (prevent enumeration)
      if (!user) {
        return res.status(200).json({ message: "If an account exists with this email, a password reset link has been sent" });
      }

      // Generate password reset token (expires in 1 hour)
      const { token: resetToken, expiresAt } = await generateTokenWithExpiration(1);
      
      await storage.updateUser(user.id!, {
        passwordResetToken: resetToken,
        passwordResetExpires: expiresAt,
      });

      try {
        await sendPasswordResetEmail(email, resetToken);
      } catch (emailError) {
        // Preserve enumeration-safe response contract.
        console.error("Failed to send password reset email:", emailError);
      }

      res.status(200).json({ message: "If an account exists with this email, a password reset link has been sent" });
    } catch (err) {
      next(err);
    }
  });

  // Reset password with token
  app.post("/api/reset-password", async (req, res, next) => {
    try {
      const validationResult = passwordResetSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }

      const { token, password } = validationResult.data;
      
      const user = await storage.getUserByPasswordResetToken(token);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      // Hash new password and update
      const hashedPassword = await hashPassword(password);
      
      await storage.updateUser(user.id!, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0, // Reset failed attempts on password reset
        lockedUntil: null,
      });

      if (user.email) {
        try {
          await sendSecurityAlertEmail(user.email, "password_reset_success");
        } catch (emailError) {
          console.error("Failed to send password change alert:", emailError);
        }
      }

      res.status(200).json({ message: "Password reset successfully" });
    } catch (err) {
      next(err);
    }
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