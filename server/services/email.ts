import fetch from "node-fetch";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type EmailConfig = {
  provider: "resend";
  apiKey: string;
  from: string;
  frontendUrl: string;
};

type SecurityAlertType = "account_locked" | "password_reset_success";
type SupportRequestType = "feedback" | "bug";

function getEmailConfigs(): EmailConfig[] {
  const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();
  const primaryApiKey = process.env.RESEND_API_KEY;
  const secondaryApiKey = process.env.RESEND_API_KEY_SECONDARY;
  const from = process.env.EMAIL_FROM;
  const frontendUrl = process.env.FRONTEND_URL;

  if (provider !== "resend") {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }

  if (!primaryApiKey || !from || !frontendUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Missing email configuration. Required: EMAIL_FROM, FRONTEND_URL, RESEND_API_KEY",
      );
    }
    return [];
  }

  const configs: EmailConfig[] = [
    {
      provider: "resend",
      apiKey: primaryApiKey,
      from,
      frontendUrl,
    },
  ];

  if (secondaryApiKey) {
    configs.push({
      provider: "resend",
      apiKey: secondaryApiKey,
      from,
      frontendUrl,
    });
  }

  return configs;
}

export function validateEmailConfiguration() {
  // In production we fail fast if auth emails cannot be delivered.
  if (process.env.NODE_ENV === "production") {
    getEmailConfigs();
  }
}

async function sendWithResend(config: EmailConfig, payload: EmailPayload): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email send failed (${response.status}): ${body}`);
  }
}

function getMaxRetries(): number {
  const parsed = Number(process.env.EMAIL_MAX_RETRIES || "2");
  if (Number.isNaN(parsed) || parsed < 0) {
    return 2;
  }
  return parsed;
}

function getRetryDelayMs(attempt: number): number {
  const baseMs = Number(process.env.EMAIL_RETRY_BASE_MS || "300");
  return baseMs * Math.pow(2, attempt);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  // Avoid external calls in tests.
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const configs = getEmailConfigs();
  if (configs.length === 0) {
    return;
  }

  const maxRetries = getMaxRetries();
  let lastError: Error | null = null;

  for (let providerIndex = 0; providerIndex < configs.length; providerIndex += 1) {
    const config = configs[providerIndex];
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        await sendWithResend(config, payload);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries) {
          await sleep(getRetryDelayMs(attempt));
        }
      }
    }
  }

  throw new Error(`All email providers failed: ${lastError?.message || "unknown error"}`);
}

function getFrontendUrl(): string {
  const configs = getEmailConfigs();
  if (configs[0]?.frontendUrl) {
    return configs[0].frontendUrl;
  }
  return process.env.FRONTEND_URL || "http://localhost:5173";
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const frontendUrl = getFrontendUrl();
  const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to: email,
    subject: "Verify your MettaModeler account",
    text: `Welcome to MettaModeler! Verify your account by visiting: ${verificationUrl}`,
    html: `
      <p>Welcome to MettaModeler!</p>
      <p>Verify your account by clicking the link below:</p>
      <p><a href="${verificationUrl}">Verify your email</a></p>
      <p>If you did not create this account, you can ignore this message.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const frontendUrl = getFrontendUrl();
  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to: email,
    subject: "Reset your MettaModeler password",
    text: `Reset your password by visiting: ${resetUrl}. This link expires in 1 hour.`,
    html: `
      <p>We received a request to reset your MettaModeler password.</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request this, you can ignore this message.</p>
    `,
  });
}

export async function sendUsernameReminderEmail(email: string, username: string): Promise<void> {
  const frontendUrl = getFrontendUrl();

  await sendEmail({
    to: email,
    subject: "Your MettaModeler username",
    text: `You requested your username. Your MettaModeler username is: ${username}. You can sign in at ${frontendUrl}/auth`,
    html: `
      <p>You requested your username.</p>
      <p>Your MettaModeler username is:</p>
      <p><strong>${username}</strong></p>
      <p><a href="${frontendUrl}/auth">Sign in</a></p>
    `,
  });
}

export async function sendSecurityAlertEmail(
  email: string,
  alertType: SecurityAlertType,
): Promise<void> {
  const frontendUrl = getFrontendUrl();

  if (alertType === "account_locked") {
    await sendEmail({
      to: email,
      subject: "MettaModeler security alert: account temporarily locked",
      text: `Your account was temporarily locked after multiple failed login attempts. If this wasn't you, reset your password here: ${frontendUrl}/forgot-password`,
      html: `
        <p>Your account was temporarily locked after multiple failed login attempts.</p>
        <p>If this wasn't you, we recommend resetting your password immediately.</p>
        <p><a href="${frontendUrl}/forgot-password">Reset password</a></p>
      `,
    });
    return;
  }

  await sendEmail({
    to: email,
    subject: "MettaModeler security notice: password changed",
    text: "Your password was changed successfully. If this was not you, reset your password immediately.",
    html: `
      <p>Your password was changed successfully.</p>
      <p>If this was not you, secure your account immediately.</p>
      <p><a href="${frontendUrl}/forgot-password">Reset password</a></p>
    `,
  });
}

export async function sendSupportRequestEmail(params: {
  type: SupportRequestType;
  email: string;
  subject: string;
  message: string;
  username?: string;
}): Promise<void> {
  const supportEmail = process.env.SUPPORT_EMAIL;
  if (!supportEmail) {
    throw new Error("SUPPORT_EMAIL is not configured");
  }

  const originLabel = params.username
    ? `User: ${params.username} (${params.email})`
    : `Email: ${params.email}`;
  const ticketSubject = `[${params.type.toUpperCase()}] ${params.subject}`;

  await sendEmail({
    to: supportEmail,
    subject: ticketSubject,
    text: `${originLabel}\n\n${params.message}`,
    html: `
      <p><strong>${originLabel}</strong></p>
      <p><strong>Type:</strong> ${params.type}</p>
      <p><strong>Subject:</strong> ${params.subject}</p>
      <p>${params.message.replace(/\n/g, "<br/>")}</p>
    `,
  });
}

