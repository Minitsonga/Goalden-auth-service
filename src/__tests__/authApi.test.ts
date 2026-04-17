import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import bcrypt from "bcrypt";
import type { Express } from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { UserModel } from "../models/User.js";

let mongoServer: MongoMemoryServer;
let app: Express;

describe("auth-service HTTP", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongoServer.getUri();
    process.env.USER_JWT_SECRET = "test-user-jwt-secret-32-characters!!";
    process.env.SERVICE_JWT_SECRET = "test-service-jwt-secret-32chars!!!";
    process.env.NODE_ENV = "test";

    await mongoose.connect(process.env.MONGO_URI);
    const mod = await import("../app.js");
    app = mod.default;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    const cols = mongoose.connection.collections;
    await Promise.all(Object.values(cols).map((c) => c.deleteMany({})));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("GET /health renvoie le statut du service", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("goalden-auth-service");
  });

  it("POST /api/auth/register refuse l'inscription directe (invitation obligatoire)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "new@example.com",
      password: "password12",
      displayName: "New User",
    });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    expect(String(res.body.error?.message)).toMatch(/register-with-invitation/i);
  });

  it("POST /api/auth/register renvoie 400 si le corps est invalide (Joi)", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "bad" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("POST /api/auth/login renvoie 401 pour un email inconnu", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "ghost@example.com",
      password: "password12",
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("POST /api/auth/login renvoie 200 avec tokens pour un utilisateur valide", async () => {
    const hash = await bcrypt.hash("password12", 10);
    await UserModel.create({
      email: "member@example.com",
      passwordHash: hash,
      displayName: "Member",
      globalRole: "USER",
      isSuperAdmin: false,
      isActive: true,
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "member@example.com",
      password: "password12",
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user?.email).toBe("member@example.com");
  });

  it("PATCH /api/users/me renvoie 403 si aucune appartenance active (team-service)", async () => {
    const hash = await bcrypt.hash("password12", 10);
    await UserModel.create({
      email: "nomember@example.com",
      passwordHash: hash,
      displayName: "No Member",
      globalRole: "USER",
      isSuperAdmin: false,
      isActive: true,
    });

    const login = await request(app).post("/api/auth/login").send({
      email: "nomember@example.com",
      password: "password12",
    });
    expect(login.status).toBe(200);
    const token = login.body.accessToken as string;

    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { hasMembership: false } }),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "Nouveau nom" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("FORBIDDEN");
  });

  it("PATCH /api/users/me renvoie 200 avec appartenance (mock team-service)", async () => {
    const hash = await bcrypt.hash("password12", 10);
    await UserModel.create({
      email: "withmember@example.com",
      passwordHash: hash,
      displayName: "With Member",
      globalRole: "USER",
      isSuperAdmin: false,
      isActive: true,
    });

    const login = await request(app).post("/api/auth/login").send({
      email: "withmember@example.com",
      password: "password12",
    });
    const token = login.body.accessToken as string;

    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { hasMembership: true } }),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "Nom mis à jour" });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe("Nom mis à jour");
  });

  it("PATCH /api/users/me super-admin sans vérification team-service", async () => {
    const hash = await bcrypt.hash("password12", 10);
    await UserModel.create({
      email: "admin@example.com",
      passwordHash: hash,
      displayName: "Admin",
      globalRole: "ADMIN",
      isSuperAdmin: true,
      isActive: true,
    });

    const login = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "password12",
    });
    const token = login.body.accessToken as string;

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "Admin renommé" });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe("Admin renommé");
  });
});
