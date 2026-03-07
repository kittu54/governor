import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { createEventBus } from "../src/modules/events/bus";

class FakeRedis {
  async incr(_key: string) {
    return 1;
  }

  async expire(_key: string, _seconds: number) {
    return 1;
  }

  async get(_key: string) {
    return null;
  }

  async quit() {
    return "OK";
  }
}

class FakePrisma {
  public agents = [
    { id: "agent_1", orgId: "org_1", name: "Agent One" },
    { id: "agent_2", orgId: "org_2", name: "Agent Two" }
  ];

  public audits = [
    {
      id: "audit_1",
      orgId: "org_1",
      agentId: "agent_1",
      timestamp: new Date(),
      status: "SUCCESS",
      decision: "ALLOW",
      toolName: "http",
      toolAction: "GET",
      latencyMs: 10
    }
  ];

  agent = {
    findMany: async ({ where, take }: any) => this.agents.filter((agent) => !where?.orgId || agent.orgId === where.orgId).slice(0, take ?? 50),
    findFirst: async ({ where }: any) =>
      this.agents.find((agent) => {
        if (where.id && agent.id !== where.id) return false;
        if (where.orgId && agent.orgId !== where.orgId) return false;
        return true;
      }) ?? null
  };

  auditEvent = {
    findMany: async ({ where }: any) =>
      this.audits.filter((audit) => {
        if (where.orgId && audit.orgId !== where.orgId) return false;
        if (where.agentId && audit.agentId !== where.agentId) return false;
        return true;
      }),
    count: async ({ where }: any) => this.audits.filter((audit) => !where?.orgId || audit.orgId === where.orgId).length
  };

  approvalRequest = {
    count: async () => 0,
    findMany: async () => []
  };

  organization = {
    findMany: async () => []
  };

  agentRun = {
    findMany: async () => []
  };

  async $disconnect() {
    return;
  }
}

describe("GET /v1/metrics/agents/:agentId", () => {
  let prisma: FakePrisma;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    prisma = new FakePrisma();
    app = await buildApp({
      prisma: prisma as any,
      redis: new FakeRedis() as any,
      eventBus: createEventBus(),
      config: {
        NODE_ENV: "test",
        API_HOST: "127.0.0.1",
        API_PORT: 4000,
        DATABASE_URL: "postgresql://test",
        REDIS_URL: "redis://localhost:6379",
        CORS_ORIGIN: "http://localhost:3000",
        CLERK_SECRET_KEY: undefined,
        CLERK_JWT_ISSUER: undefined
      }
    });
  });

  it("requires org_id query parameter", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/metrics/agents/agent_1"
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns org-scoped agent data", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/metrics/agents/agent_1?org_id=org_1"
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.agent.org_id).toBe("org_1");
    expect(body.agent.name).toBe("Agent One");
  });

  it("returns 404 for an agent outside the requested org", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/metrics/agents/agent_2?org_id=org_1"
    });

    expect(response.statusCode).toBe(404);
  });
});
