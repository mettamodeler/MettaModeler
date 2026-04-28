import { afterEach, describe, expect, it } from "vitest";
import {
  sendPasswordResetEmail,
  sendSecurityAlertEmail,
  sendSupportRequestEmail,
  sendUsernameReminderEmail,
  sendVerificationEmail,
  validateEmailConfiguration,
} from "../services/email";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("email service configuration", () => {
  it("does not throw in non-production when email config is missing", () => {
    process.env.NODE_ENV = "development";
    delete process.env.EMAIL_FROM;
    delete process.env.FRONTEND_URL;
    delete process.env.RESEND_API_KEY;

    expect(() => validateEmailConfiguration()).not.toThrow();
  });

  it("fails fast in production when required config is missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.EMAIL_FROM;
    delete process.env.FRONTEND_URL;
    delete process.env.RESEND_API_KEY;

    expect(() => validateEmailConfiguration()).toThrow(
      /Missing email configuration/i,
    );
  });

  it("skips external email delivery in test environment", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.EMAIL_FROM;
    delete process.env.FRONTEND_URL;
    delete process.env.RESEND_API_KEY;

    await expect(sendVerificationEmail("user@example.com", "token123")).resolves.toBeUndefined();
    await expect(sendPasswordResetEmail("user@example.com", "token456")).resolves.toBeUndefined();
    await expect(sendUsernameReminderEmail("user@example.com", "sample_user")).resolves.toBeUndefined();
    await expect(sendSecurityAlertEmail("user@example.com", "account_locked")).resolves.toBeUndefined();
    await expect(sendSecurityAlertEmail("user@example.com", "password_reset_success")).resolves.toBeUndefined();
    await expect(
      sendSupportRequestEmail({
        type: "feedback",
        email: "user@example.com",
        subject: "Great app",
        message: "Thanks for building this!",
      }),
    ).resolves.toBeUndefined();
  });
});

