# Security Features Testing Guide

**Date:** 2025-01-15  
**Purpose:** Test Phase 1 security improvements before moving to Phase 2

---

## Quick Test Checklist

### ✅ 1. Start Development Server
```bash
npm run dev
```
- Should start without errors
- Should show warning about auto-generated SESSION_SECRET (this is OK for dev)

### ✅ 2. Test Password Validation (Frontend)
1. Go to registration page
2. Try weak passwords - should show validation errors:
   - `password` (too short, no complexity)
   - `Password123` (no special character)
   - `PASSWORD123!` (no lowercase)
   - `Password!` (too short)
3. Try strong password - should pass:
   - `Password123!` (12+ chars, all requirements)

### ✅ 3. Test Password Validation (Backend)
1. Use browser DevTools Network tab
2. Try to register with weak password that passes frontend (if any)
3. Should get 400 error with validation details

### ✅ 4. Test Username Validation
1. Try invalid usernames:
   - `ab` (too short)
   - `user@name` (special chars not allowed)
   - `user name` (spaces not allowed)
2. Try valid username:
   - `testuser123` (should work)

### ✅ 5. Test Username Enumeration Fix
1. Try to register with existing username
2. Should get generic error: "Registration failed. Please check your input and try again."
3. Should NOT say "Username already exists"

### ✅ 6. Test Rate Limiting (Registration)
1. Try to register 6 times quickly (within 15 minutes)
2. After 5 attempts, should get rate limit error
3. Wait 15 minutes or restart server to reset

### ✅ 7. Test Rate Limiting (Login)
1. Try to login with wrong password 6 times
2. After 5 attempts, should get rate limit error
3. Successful login should NOT count toward limit

### ✅ 8. Test Session Regeneration
1. Login successfully
2. Check browser DevTools → Application → Cookies
3. Session cookie should have new value after login

---

## Detailed Testing Steps

### Test 1: Password Strength Requirements

**Frontend Test:**
```bash
# Start dev server
npm run dev
```

1. Navigate to `/auth` (registration tab)
2. Enter username: `testuser`
3. Try these passwords and verify errors:

| Password | Expected Error |
|----------|---------------|
| `pass` | "Password must be at least 12 characters" |
| `password123` | "Password must contain at least one uppercase letter" |
| `PASSWORD123` | "Password must contain at least one lowercase letter" |
| `Password` | "Password must contain at least one number" |
| `Password123` | "Password must contain at least one special character" |
| `Password123!` | ✅ Should pass validation |

**Backend Test (using curl or Postman):**
```bash
# This should fail with validation error
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"weak"}'
```

Expected response:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must be at least 12 characters"
    }
  ]
}
```

---

### Test 2: Rate Limiting

**Registration Rate Limit:**
```bash
# Run this 6 times quickly
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"Password123!","displayName":"Test"}'

curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user2","password":"Password123!","displayName":"Test"}'

# ... repeat 4 more times
```

After 5 attempts, should get:
```json
{
  "error": "Too many registration attempts from this IP, please try again later",
  "retryAfter": "15 minutes"
}
```

**Login Rate Limit:**
```bash
# Try wrong password 6 times
for i in {1..6}; do
  curl -X POST http://localhost:8080/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"wrongpass"}'
done
```

After 5 attempts, should get rate limit error.

---

### Test 3: Username Enumeration Fix

**Before Fix:**
- Register with existing username → "Username already exists" ❌

**After Fix:**
- Register with existing username → "Registration failed. Please check your input and try again." ✅

**Test:**
1. Register a user: `testuser` / `Password123!`
2. Try to register again with same username
3. Should get generic error message

---

### Test 4: Session Secret Requirement

**Production Mode Test:**
```bash
# This should FAIL (no SESSION_SECRET)
NODE_ENV=production npm start
```

Expected error:
```
Error: SESSION_SECRET must be set in production. Generate a secure random string and set it as an environment variable.
```

**With SESSION_SECRET:**
```bash
# This should WORK
NODE_ENV=production SESSION_SECRET=$(openssl rand -hex 32) npm start
```

---

### Test 5: Frontend-Backend Validation Consistency

1. **Test that frontend blocks weak passwords:**
   - Try to submit form with weak password
   - Form should not submit (validation error shown)

2. **Test that backend also validates:**
   - Bypass frontend validation (disable JS or use curl)
   - Send weak password directly to API
   - Backend should reject with 400 error

---

## Automated Testing Script

Create a simple test script to verify key features:

```bash
#!/bin/bash
# test-security.sh

BASE_URL="http://localhost:8080"

echo "Testing Security Features..."
echo ""

# Test 1: Weak password rejection
echo "Test 1: Weak password rejection"
RESPONSE=$(curl -s -X POST $BASE_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test1","password":"weak"}')
if echo "$RESPONSE" | grep -q "Validation failed"; then
  echo "✅ Weak password correctly rejected"
else
  echo "❌ Weak password was accepted (should be rejected)"
fi
echo ""

# Test 2: Strong password acceptance
echo "Test 2: Strong password acceptance"
RESPONSE=$(curl -s -X POST $BASE_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser'$(date +%s)'","password":"Password123!","displayName":"Test"}')
if echo "$RESPONSE" | grep -q "id"; then
  echo "✅ Strong password correctly accepted"
else
  echo "❌ Strong password was rejected (should be accepted)"
  echo "Response: $RESPONSE"
fi
echo ""

# Test 3: Username enumeration fix
echo "Test 3: Username enumeration fix"
RESPONSE=$(curl -s -X POST $BASE_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser'$(date +%s)'","password":"Password123!"}')
if echo "$RESPONSE" | grep -q "Registration failed"; then
  echo "✅ Generic error message (username enumeration fixed)"
else
  echo "⚠️  Check error message format"
fi
echo ""

echo "Testing complete!"
```

---

## Manual UI Testing

### Registration Form Testing

1. **Navigate to registration page**
2. **Test each field:**

   **Username:**
   - ✅ `testuser` - should work
   - ❌ `ab` - should show "Username must be at least 3 characters"
   - ❌ `user@name` - should show "Username can only contain letters, numbers, underscores, and hyphens"
   - ❌ `user name` - should show validation error

   **Password:**
   - ❌ `short` - should show "Password must be at least 12 characters"
   - ❌ `password123` - should show "Password must contain at least one uppercase letter"
   - ❌ `PASSWORD123` - should show "Password must contain at least one lowercase letter"
   - ❌ `Password` - should show "Password must contain at least one number"
   - ❌ `Password123` - should show "Password must contain at least one special character"
   - ✅ `Password123!` - should pass all validations

   **Display Name:**
   - ✅ Empty - should work (optional)
   - ✅ `John Doe` - should work
   - ❌ Very long string (101+ chars) - should show error

3. **Submit form with valid data**
   - Should successfully register and log in
   - Should redirect to home page

---

## What to Look For

### ✅ Success Indicators:
- Weak passwords are rejected with clear error messages
- Rate limiting blocks after 5 attempts
- Generic error messages (no username enumeration)
- Frontend and backend validation match
- Strong passwords work correctly
- Session regenerates on login

### ❌ Red Flags:
- Weak passwords are accepted
- No rate limiting (can make unlimited requests)
- Specific error messages reveal username existence
- Frontend and backend validation differ
- Application crashes or errors

---

## Common Issues & Fixes

### Issue: "express-rate-limit not found"
**Fix:** Run `npm install` to install the new dependency

### Issue: Rate limiting too aggressive
**Fix:** Adjust limits in `server/middleware/rateLimit.ts`

### Issue: Password validation too strict
**Fix:** Adjust requirements in `server/validation/auth.ts` and `client/src/hooks/use-auth.tsx`

### Issue: TypeScript errors
**Fix:** Most are pre-existing. The new security code should compile fine.

---

## Next Steps After Testing

If all tests pass:
- ✅ Ready to proceed with Phase 2
- ✅ Can deploy to production (with SESSION_SECRET set)
- ✅ Consider adding automated tests

If tests fail:
- Fix issues before Phase 2
- Document any edge cases found
- Adjust validation rules if needed

---

## Quick Test Command

Run this to quickly verify the server starts and basic validation works:

```bash
# Start server
npm run dev

# In another terminal, test validation
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"weak"}' | jq
```

Should return validation error with details.


