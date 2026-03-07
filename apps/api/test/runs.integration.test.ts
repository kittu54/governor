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
  public runs = [
    {
      id: "run_1",
      orgId: "org_1",
      agentId: "agent_1",
      source: "CUSTOM",
      provider: "custom",
      model: null,
      framework: null,
      runtime: null,
      taskName: "triage",
      status: "SUCCESS",
      startedAt: new Date(),
      endedAt: new Date(),
      durationMs: 1000,
      totalInputTokens: 100,
      totalOutputTokens: 50,
      totalCostUsd: 0.01,
      totalToolCalls: 2,
      errorMessage: null,
      riskScore: null,
      tags: null,
      metadata: null
    },
    {
      id: "run_2",
      orgId: "org_2",
      agentId: "agent_2",
      source: "CUSTOM",
      provider: "custom",
      model: null,
      framework: null,
      runtime: null,
      taskName: "billing",
      status: "ERROR",
      startedAt: new Date(),
      endedAt: new Date(),
      durationMs: 2000,
      totalInputTokens: 120,
      totalOutputTokens: 60,
      totalCostUsd: 0.02,
      totalToolCalls: 3,
      errorMessage: "failed",
      riskScore: null,
      tags: null,
      metadata: null
    }
  ];

  public events = [
    {
      id: "evt_1",
      runId: "run_1",
      orgId: "org_1",
      agentId: "agent_1",
      timestamp: new Date(),
      type: "RUN_COMPLETED",
      source: "CUSTOM",
      provider: null,
      model: null,
      stepName: null,
      toolName: null,
      toolAction: null,
      inputTokens: null,
      outputTokens: null,
      costUsd: 0,
      latencyMs: null,
      status: "SUCCESS",
      errorMessage: null,
      sequence: 1,
      inputPayload: null,
      outputPayload: null,
      parameters: null,
      metadata: null
    },
    {
      id: "evt_2",
      runId: "run_2",
      orgId: "org_2",
      agentId: "agent_2",
      timestamp: new Date(),
      type: "RUN_FAILED",
      source: "CUSTOM",
      provider: null,
      model: null,
      stepName: null,
      toolName: null,
      toolAction: null,
      inputTokens: null,
      outputTokens: null,
      costUsd: 0,
      latencyMs: null,
      status: "ERROR",
      errorMessage: "failed",
      sequence: 1,
      inputPayload: null,
      outputPayload: null,
      parameters: null,
      metadata: null
    }
  ];

  agentRun = {
    findMany: async ({ where }: any) =>
      this.runs.filter((run) => {
        if (where.orgId && run.orgId !== where.orgId) return false;
        if (where.agentId && run.agentId !== where.agentId) return false;
        if (where.provider && run.provider !== where.provider) return false;
        if (where.status && run.status !== where.status) return false;
        return true;
      }),
    findFirst: async ({ where }: any) =>
      this.runs.find((run) => {
        if (where.id && run.id !== where.id) return false;
        if (where.orgId && run.orgId !== where.orgId) return false;
        return true;
      }) ?? null
  };

  agentEvent = {
    findMany: async ({ where }: any) =>
      this.events.filter((event) => {
        if (where.runId && event.runId !== where.runId) return false;
        if (where.orgId && event.orgId !== where.orgId) return false;
        return true;
      })
  };

  async $disconnect() {
    return;
  }
}

describe("/v1/runs org scoping", () => {
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

  it("requires org_id for runs list", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/runs" });
    expect(response.statusCode).toBe(400);
  });

  it("requires org_id for run detail", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/runs/run_1" });
    expect(response.statusCode).toBe(400);
  });

  it("returns only org-scoped run details", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/runs/run_1?org_id=org_1" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.run.id).toBe("run_1");
    expect(body.run.org_id).toBe("org_1");
    expect(body.events).toHaveLength(1);
    expect(body.events[0].org_id).toBe("org_1");
  });

  it("does not allow cross-org run detail access", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/runs/run_2?org_id=org_1" });
    expect(response.statusCode).toBe(404);
  });


  it("does not allow cross-org run analysis access", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/runs/run_2/analyze?org_id=org_1",
      payload: { question: "What happened?" }
    });

    expect(response.statusCode).toBe(404);
  });

  it("requires org_id for run analyze", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/runs/run_1/analyze",
      payload: { question: "What happened?" }
    });

    expect(response.statusCode).toBe(400);
  });
});
