import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { app } from "../src/app";
import { connectDb } from "../src/config/db";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }
});

async function register(agent: ReturnType<typeof request.agent>, email: string) {
  const response = await agent.post("/api/auth/register").send({
    name: "Asha",
    email,
    password: "hunter22",
  });
  expect(response.status).toBe(201);
  return response;
}

describe("auth and jobs", () => {
  it("registers, rejects a bad password, and hides someone else's job", async () => {
    const asha = request.agent(app);
    await register(asha, "asha@example.com");

    const me = await asha.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe("asha@example.com");

    await asha.post("/api/auth/logout");
    expect((await asha.get("/api/auth/me")).status).toBe(401);

    const bad = await asha.post("/api/auth/login").send({ email: "asha@example.com", password: "nope1234" });
    expect(bad.status).toBe(401);

    await asha.post("/api/auth/login").send({ email: "asha@example.com", password: "hunter22" });
    const created = await asha.post("/api/jobs").send({
      company: "Figma",
      title: "Product engineer",
      description: "React and TypeScript",
      requiredSkills: ["React", "TypeScript"],
    });
    expect(created.status).toBe(201);
    const jobId = created.body.data.job.id as string;

    const listed = await asha.get("/api/jobs").query({ q: "fig" });
    expect(listed.body.data.total).toBe(1);

    const other = request.agent(app);
    await register(other, "sam@example.com");
    const hidden = await other.get(`/api/jobs/${jobId}`);
    expect(hidden.status).toBe(404);
  });

  it("resets a password from the dev link and refuses the old one", async () => {
    const agent = request.agent(app);
    await register(agent, "reset@example.com");
    const forgot = await agent.post("/api/auth/forgot-password").send({ email: "reset@example.com" });
    expect(forgot.body.data.devLink).toContain("token=");
    const token = new URL(forgot.body.data.devLink).searchParams.get("token");
    const reset = await agent.post("/api/auth/reset-password").send({ token, password: "newpass99" });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app).post("/api/auth/login").send({ email: "reset@example.com", password: "hunter22" });
    expect(oldLogin.status).toBe(401);
    const next = await request(app).post("/api/auth/login").send({ email: "reset@example.com", password: "newpass99" });
    expect(next.status).toBe(200);
  });
});
