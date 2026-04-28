-- Add security and account management fields to users table
ALTER TABLE "users" ADD COLUMN "email" text;
ALTER TABLE "users" ADD COLUMN "email_verified" text DEFAULT 'false';
ALTER TABLE "users" ADD COLUMN "email_verification_token" text;
ALTER TABLE "users" ADD COLUMN "email_verification_expires" timestamp;
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp;
ALTER TABLE "users" ADD COLUMN "password_reset_token" text;
ALTER TABLE "users" ADD COLUMN "password_reset_expires" timestamp;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_email_verification_token_idx" ON "users"("email_verification_token");
CREATE INDEX IF NOT EXISTS "users_password_reset_token_idx" ON "users"("password_reset_token");


