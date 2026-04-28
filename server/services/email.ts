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

function getEmailConfig(): EmailConfig | null {
  const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const frontendUrl = process.env.FRONTEND_URL;

  if (provider !== "resend") {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }

  if (!apiKey || !from || !frontendUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Missing email configuration. Required: EMAIL_FROM, FRONTEND_URL, RESEND_API_KEY",
      );
    }
    return null;
  }

  return {
    provider: "resend",
    apiKey,
    from,
    frontendUrl,
  };
}

export function validateEmailConfiguration() {
  // In production we fail fast if auth emails cannot be delivered.
  if (process.env.NODE_ENV === "production") {
    getEmailConfig();
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

async function sendEmail(payload: EmailPayload): Promise<void> {
  // Avoid external calls in tests.
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const config = getEmailConfig();
  if (!config) {
    return;
  }

  await sendWithResend(config, payload);
}

function getFrontendUrl(): string {
  const config = getEmailConfig();
  if (config?.frontendUrl) {
    return config.frontendUrl;
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

