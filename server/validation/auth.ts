import { z } from 'zod';

/**
 * Username validation schema
 * - Minimum 3 characters
 * - Maximum 30 characters
 * - Only alphanumeric, underscores, and hyphens
 * - Normalized to lowercase
 */
export const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be less than 30 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
  .transform(val => val.toLowerCase().trim());

/**
 * Email validation schema
 * - Valid email format
 * - Normalized to lowercase
 */
export const emailSchema = z.string()
  .email("Please enter a valid email address")
  .max(255, "Email must be less than 255 characters")
  .transform(val => val.toLowerCase().trim());

/**
 * Password validation schema
 * - Minimum 12 characters
 * - Maximum 128 characters
 * - Must contain at least one uppercase letter
 * - Must contain at least one lowercase letter
 * - Must contain at least one number
 * - Must contain at least one special character
 */
export const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

/**
 * Display name validation schema
 * - Optional
 * - Maximum 100 characters
 * - Trimmed
 */
export const displayNameSchema = z.string()
  .max(100, "Display name must be less than 100 characters")
  .optional()
  .transform(val => val?.trim() || null);

/**
 * Registration request schema
 */
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

/**
 * Login request schema
 */
export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required"),
});

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

/**
 * Username recovery request schema
 */
export const usernameRecoveryRequestSchema = z.object({
  email: emailSchema,
});

/**
 * Password reset schema
 */
export const passwordResetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
});

/**
 * Support request schema
 */
export const supportRequestSchema = z.object({
  type: z.enum(["feedback", "bug"]),
  email: emailSchema,
  subject: z.string().min(3, "Subject is required").max(200, "Subject is too long").transform((v) => v.trim()),
  message: z.string().min(10, "Please provide more detail").max(5000, "Message is too long").transform((v) => v.trim()),
});

