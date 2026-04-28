import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for registration endpoint
 * Limits: 5 attempts per 15 minutes per IP
 */
export const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many registration attempts from this IP, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count all requests, including successful ones
  skip: () => process.env.NODE_ENV === "test",
});

/**
 * Rate limiter for login endpoint
 * Limits: 5 attempts per 15 minutes per IP
 * Skips successful requests to allow legitimate users to retry
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many login attempts from this IP, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  skip: () => process.env.NODE_ENV === "test",
});


