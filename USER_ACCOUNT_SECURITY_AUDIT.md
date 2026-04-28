# MettaModeler User Account Creation Security Audit

**Date:** 2025-01-15  
**Scope:** User registration, authentication, and account management

---

## Executive Summary

The current user account creation process is **functionally secure** for basic use but has several areas that need improvement for production deployment, especially if handling sensitive data or scaling to many users.

**Overall Security Rating:** ⚠️ **MODERATE** - Suitable for MVP/beta, needs hardening for production

---

## Current Implementation

### Data Collected During Registration

1. **Username** (required)
   - Minimum length: 3 characters
   - Must be unique
   - No format restrictions (alphanumeric, special chars allowed)

2. **Password** (required)
   - Minimum length: 6 characters
   - No complexity requirements
   - No maximum length enforced

3. **Display Name** (optional)
   - Free-form text
   - No validation

### Security Measures Currently in Place

✅ **Good Practices:**
- Passwords are hashed using `scrypt` (cryptographically secure)
- Salt is generated per password (16 bytes, hex encoded)
- Timing-safe password comparison (`timingSafeEqual`)
- Passwords never returned in API responses
- Session-based authentication with secure cookies
- Session secret can be configured via environment variable
- HTTPS enforced in production (`secure: true` cookie flag)
- SameSite cookie protection (`lax`)

⚠️ **Areas of Concern:**
- Session secret auto-generated if not set (changes on restart)
- No rate limiting on registration/login endpoints
- Username enumeration vulnerability
- Weak password requirements
- No account lockout mechanism
- No email verification
- No password reset functionality

---

## Detailed Security Analysis

### 1. Password Security

**Current State:**
```typescript
// server/auth.ts
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}
```

**Strengths:**
- Uses `scrypt` (modern, memory-hard KDF)
- 64-byte output (512 bits)
- Unique salt per password
- Salt stored with hash (standard practice)

**Weaknesses:**
- Minimum password length only 6 characters (too weak)
- No complexity requirements (allows "password", "123456", etc.)
- No maximum length limit (potential DoS via extremely long passwords)
- No password strength indicator

**Recommendations:**
1. **Increase minimum length to 12 characters**
2. **Add complexity requirements:**
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character
3. **Add maximum length (e.g., 128 characters)**
4. **Implement password strength meter on frontend**
5. **Check against common password lists (e.g., Have I Been Pwned API)**

### 2. Username Enumeration

**Current State:**
```typescript
// server/auth.ts - Registration
const existingUser = await storage.getUserByUsername(username);
if (existingUser) {
  return res.status(400).send("Username already exists");
}
```

**Vulnerability:**
- Attackers can determine if a username exists by attempting registration
- This enables targeted attacks on known accounts

**Recommendation:**
- Use generic error messages: "Registration failed" instead of "Username already exists"
- Consider rate limiting registration attempts per IP
- Add CAPTCHA after multiple failed attempts

### 3. Rate Limiting

**Current State:**
- ❌ No rate limiting on `/api/register`
- ❌ No rate limiting on `/api/login`
- ❌ No rate limiting on `/api/logout`

**Risk:**
- Brute force attacks on login
- Account enumeration via registration
- DoS attacks

**Recommendations:**
1. **Implement rate limiting middleware:**
   ```typescript
   // Use express-rate-limit
   import rateLimit from 'express-rate-limit';
   
   const registrationLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5, // 5 attempts per window
     message: 'Too many registration attempts, please try again later'
   });
   ```

2. **Stricter limits for login:**
   - 5 attempts per 15 minutes per IP
   - Account lockout after 10 failed attempts

3. **Progressive delays:**
   - Exponential backoff for repeated failures

### 4. Session Security

**Current State:**
```typescript
const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
```

**Issues:**
- Auto-generated secret changes on server restart
- All users logged out on restart
- No session invalidation on password change

**Recommendations:**
1. **Require SESSION_SECRET in production:**
   ```typescript
   if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
     throw new Error('SESSION_SECRET must be set in production');
   }
   ```

2. **Add session rotation:**
   - Regenerate session ID on login
   - Invalidate all sessions on password change

3. **Session timeout:**
   - Current: 7 days (may be too long)
   - Consider: 24 hours with "remember me" option

### 5. Account Lockout

**Current State:**
- ❌ No account lockout mechanism
- ❌ No tracking of failed login attempts

**Risk:**
- Unlimited brute force attempts
- Account takeover via password guessing

**Recommendations:**
1. **Track failed login attempts:**
   ```sql
   ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
   ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
   ```

2. **Lock account after 10 failed attempts:**
   - Lock for 30 minutes
   - Reset counter on successful login

3. **Admin notification:**
   - Alert on multiple lockouts

### 6. Email Verification

**Current State:**
- ❌ No email field collected
- ❌ No email verification
- ❌ No password reset via email

**Impact:**
- Cannot recover accounts
- Cannot verify user identity
- Cannot send security notifications

**Recommendations:**
1. **Add email field to registration** (required)
2. **Send verification email:**
   - Generate verification token
   - Store in database with expiration
   - Require verification before account activation

3. **Password reset flow:**
   - "Forgot password" link
   - Email with reset token (expires in 1 hour)
   - Force password change on reset

### 7. Input Validation

**Current State:**
```typescript
// Frontend validation
username: z.string().min(3, "Username must be at least 3 characters"),
password: z.string().min(6, "Password must be at least 6 characters"),
displayName: z.string().optional(),
```

**Issues:**
- No server-side validation schema
- No sanitization of display names
- No length limits on username/displayName

**Recommendations:**
1. **Add server-side validation:**
   ```typescript
   import { z } from 'zod';
   
   const registerSchema = z.object({
     username: z.string()
       .min(3)
       .max(30)
       .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
     password: z.string()
       .min(12)
       .max(128)
       .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
       .regex(/[a-z]/, "Password must contain at least one lowercase letter")
       .regex(/[0-9]/, "Password must contain at least one number")
       .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
     displayName: z.string()
       .max(100)
       .optional()
       .transform(val => val?.trim() || null),
   });
   ```

2. **Sanitize inputs:**
   - Trim whitespace
   - Remove HTML tags from display names
   - Normalize usernames (lowercase)

### 8. Logging and Monitoring

**Current State:**
- ❌ No security event logging
- ❌ No failed login attempt tracking
- ❌ No suspicious activity detection

**Recommendations:**
1. **Log security events:**
   - Failed login attempts
   - Account lockouts
   - Password changes
   - Registration attempts

2. **Monitor for:**
   - Multiple failed logins from same IP
   - Registration spikes
   - Unusual login patterns

### 9. Data Privacy

**Current State:**
- ✅ Passwords never returned in API
- ✅ Display names are optional
- ⚠️ No GDPR compliance features
- ⚠️ No data export functionality
- ⚠️ No account deletion

**Recommendations:**
1. **Add account deletion:**
   - Soft delete (mark as deleted)
   - Hard delete after retention period
   - Cascade delete user's projects/models

2. **Data export:**
   - Allow users to download their data
   - JSON format with all user content

3. **Privacy policy:**
   - Clear data collection statement
   - Cookie consent (if required)

---

## Priority Recommendations

### 🔴 HIGH PRIORITY (Implement Before Production)

1. **Require SESSION_SECRET in production**
   - Fail fast if not set
   - Document in deployment guide

2. **Implement rate limiting**
   - Registration: 5 attempts per 15 minutes
   - Login: 5 attempts per 15 minutes per IP

3. **Strengthen password requirements**
   - Minimum 12 characters
   - Add complexity requirements
   - Add password strength meter

4. **Add server-side input validation**
   - Use Zod schemas
   - Sanitize all inputs

5. **Fix username enumeration**
   - Generic error messages
   - Same response time for existing/non-existing users

### 🟡 MEDIUM PRIORITY (Implement Soon)

6. **Add account lockout**
   - Track failed attempts
   - Lock after 10 failures

7. **Add email verification**
   - Collect email during registration
   - Send verification email
   - Require verification before activation

8. **Add password reset**
   - "Forgot password" flow
   - Email-based reset tokens

9. **Improve session security**
   - Regenerate session on login
   - Invalidate on password change
   - Shorter default timeout

### 🟢 LOW PRIORITY (Nice to Have)

10. **Add security logging**
    - Log failed attempts
    - Monitor suspicious activity

11. **Add account deletion**
    - User-initiated deletion
    - Data export before deletion

12. **Add 2FA (Two-Factor Authentication)**
    - TOTP-based (Google Authenticator, etc.)
    - Optional but recommended

---

## Implementation Checklist

### Phase 1: Critical Security Fixes
- [ ] Require SESSION_SECRET in production
- [ ] Add rate limiting middleware
- [ ] Strengthen password requirements (12+ chars, complexity)
- [ ] Add server-side validation with Zod
- [ ] Fix username enumeration vulnerability
- [ ] Add maximum password length limit

### Phase 2: Account Security
- [ ] Add account lockout mechanism
- [ ] Track failed login attempts
- [ ] Add email field to registration
- [ ] Implement email verification
- [ ] Add password reset flow

### Phase 3: Enhanced Security
- [ ] Add security event logging
- [ ] Implement session rotation
- [ ] Add account deletion
- [ ] Add data export functionality
- [ ] Add password strength meter UI

### Phase 4: Advanced Features
- [ ] Add 2FA support
- [ ] Add "remember me" functionality
- [ ] Add suspicious activity detection
- [ ] Add admin security dashboard

---

## Code Examples

### Rate Limiting Implementation

```typescript
// server/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many registration attempts from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts from this IP, please try again later',
  skipSuccessfulRequests: true,
});
```

### Enhanced Password Validation

```typescript
// shared/validation.ts
import { z } from 'zod';

export const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be less than 30 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
  .transform(val => val.toLowerCase().trim());
```

### Account Lockout Implementation

```typescript
// server/auth.ts additions
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

async function checkAccountLockout(username: string): Promise<void> {
  const user = await storage.getUserByUsername(username);
  if (!user) return; // Don't reveal if user exists
  
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
    throw new Error(`Account is locked. Try again in ${minutesLeft} minutes.`);
  }
}

async function recordFailedLogin(username: string): Promise<void> {
  const user = await storage.getUserByUsername(username);
  if (!user) return;
  
  const attempts = (user.failedLoginAttempts || 0) + 1;
  const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS 
    ? new Date(Date.now() + LOCKOUT_DURATION_MS)
    : null;
  
  await storage.updateUser(user.id, {
    failedLoginAttempts: attempts,
    lockedUntil,
  });
}

async function resetFailedAttempts(userId: number): Promise<void> {
  await storage.updateUser(userId, {
    failedLoginAttempts: 0,
    lockedUntil: null,
  });
}
```

---

## Testing Recommendations

1. **Security Testing:**
   - Test rate limiting (should block after 5 attempts)
   - Test account lockout (should lock after 10 failures)
   - Test password requirements (reject weak passwords)
   - Test username enumeration (should not reveal existence)
   - Test session security (should invalidate on password change)

2. **Penetration Testing:**
   - Brute force attack simulation
   - SQL injection attempts (should be prevented by ORM)
   - XSS attempts (should be sanitized)
   - CSRF protection (should be handled by SameSite cookies)

---

## Conclusion

The current authentication system uses modern cryptographic practices (scrypt) and follows many security best practices. However, it needs hardening for production use, particularly around:

1. **Password strength** (currently too weak)
2. **Rate limiting** (currently missing)
3. **Account recovery** (email verification, password reset)
4. **Session management** (auto-generated secrets)

With the recommended improvements, the system will be production-ready and resistant to common attacks.

**Estimated Implementation Time:**
- Phase 1 (Critical): 2-3 days
- Phase 2 (Account Security): 3-4 days
- Phase 3 (Enhanced): 2-3 days
- Phase 4 (Advanced): 1-2 weeks

**Total: ~2-3 weeks for full implementation**


