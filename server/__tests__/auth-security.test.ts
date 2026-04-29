import express from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { storage } from "../storage";
import { hashPassword } from "../auth";

type RegisterRoutes = (app: express.Express) => Promise<import("http").Server>;

const strongPassword = "Str0ng!Passw0rd";

describe("auth security flows", () => {
  let app: express.Express;
  let registerRoutes: RegisterRoutes;

  beforeAll(async () => {
    ({ registerRoutes } = await import("../routes"));
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(app);
  });

  it("locks account after repeated failed login attempts", async () => {
    const username = `lockuser_${Date.now()}`;
    const email = `${username}@example.com`;

    const registerResponse = await request(app).post("/api/register").send({
      username,
      email,
      password: strongPassword,
      displayName: username,
    });
    expect(registerResponse.status).toBe(201);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app).post("/api/login").send({
        username,
        password: "WrongPassword!123",
      });
      expect(response.status).toBe(401);
    }

    const user = await storage.getUserByUsername(username);
    expect(user).toBeDefined();
    expect((user?.failedLoginAttempts ?? 0) >= 5).toBe(true);
    expect(user?.lockedUntil).toBeTruthy();
    expect((user?.lockedUntil?.getTime() ?? 0) > Date.now()).toBe(true);
  });

  it("rejects expired email verification tokens", async () => {
    const username = `verifyuser_${Date.now()}`;
    const email = `${username}@example.com`;

    const registerResponse = await request(app).post("/api/register").send({
      username,
      email,
      password: strongPassword,
      displayName: username,
    });
    expect(registerResponse.status).toBe(201);

    const user = await storage.getUserByUsername(username);
    expect(user?.emailVerificationToken).toBeTruthy();

    await storage.updateUser(user!.id, {
      emailVerificationExpires: new Date(Date.now() - 60_000),
    });

    const response = await request(app).post("/api/verify-email").send({
      token: user!.emailVerificationToken,
    });

    expect(response.status).toBe(400);
    expect(response.body?.error).toMatch(/expired/i);
  });

  it("rejects expired password reset tokens", async () => {
    const username = `resetuser_${Date.now()}`;
    const email = `${username}@example.com`;

    const registerResponse = await request(app).post("/api/register").send({
      username,
      email,
      password: strongPassword,
      displayName: username,
    });
    expect(registerResponse.status).toBe(201);

    const forgotResponse = await request(app).post("/api/forgot-password").send({ email });
    expect(forgotResponse.status).toBe(200);

    const user = await storage.getUserByUsername(username);
    expect(user?.passwordResetToken).toBeTruthy();

    await storage.updateUser(user!.id, {
      passwordResetExpires: new Date(Date.now() - 60_000),
    });

    const resetResponse = await request(app).post("/api/reset-password").send({
      token: user!.passwordResetToken,
      password: "An0ther!StrongPass",
    });

    expect(resetResponse.status).toBe(400);
    expect(resetResponse.body?.error).toMatch(/expired/i);
  });

  it("does not apply registration limiter in test mode", async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await request(app).post("/api/register").send({
        username: "ab", // invalid username (too short)
        email: "bad@example.com",
        password: "weak",
        displayName: "bad",
      });

      // In test mode limiter is skipped, so this should remain a validation error.
      expect(response.status).toBe(400);
      expect(response.body?.error).toBe("Validation failed");
    }
  });

  it("supports username recovery with enumeration-safe responses", async () => {
    const username = `recoveruser_${Date.now()}`;
    const email = `${username}@example.com`;

    const registerResponse = await request(app).post("/api/register").send({
      username,
      email,
      password: strongPassword,
      displayName: username,
    });
    expect(registerResponse.status).toBe(201);

    const existingResponse = await request(app).post("/api/forgot-username").send({ email });
    expect(existingResponse.status).toBe(200);
    expect(existingResponse.body?.message).toMatch(/if an account exists/i);

    const unknownResponse = await request(app).post("/api/forgot-username").send({
      email: `missing_${Date.now()}@example.com`,
    });
    expect(unknownResponse.status).toBe(200);
    expect(unknownResponse.body?.message).toMatch(/if an account exists/i);
  });

  it("allows login for legacy mixed-case usernames", async () => {
    const mixedCaseUsername = `JennyCase_${Date.now()}`;
    const loginUsername = mixedCaseUsername.toLowerCase();
    const password = "Legacy!Case1234";
    const hashedPassword = await hashPassword(password);
    const email = `${loginUsername}@example.com`;

    await storage.createUser({
      username: mixedCaseUsername,
      email,
      password: hashedPassword,
      displayName: mixedCaseUsername,
      role: "user",
      emailVerified: "true",
    });

    const response = await request(app).post("/api/login").send({
      username: loginUsername,
      password,
    });

    expect(response.status).toBe(200);
    expect(response.body?.username).toBe(mixedCaseUsername);
  });
});
