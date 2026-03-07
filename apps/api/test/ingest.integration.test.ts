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
  public organizations = new Map<string, { id: string; name: string }>();
  public agents = new Map<string, { id: string; orgId: string; name: string }>();
  public runs = new Map<string, any>();
  public events: any[] = [];

  organization = {
    upsert: async ({ where, create }: any) => {
      const found = this.organizations.get(where.id);
      if (found) {
        return found;
      }
      this.organizations.set(create.id, create);
      return create;
    }
  };

  agent = {
    upsert: async ({ where, create, update }: any) => {
      const found = this.agents.get(where.id);
      if (!found) {
        this.agents.set(create.id, create);
        return create;
      }

      const merged = { ...found, ...update };
      this.agents.set(where.id, merged);
      return merged;
    }
  };

  agentRun = {
    upsert: async ({ where, create, update }: any) => {
      const found = this.runs.get(where.id);
      if (!found) {
        this.runs.set(create.id, create);
        return create;
      }

      const merged = { ...found, ...update };
      this.runs.set(where.id, merged);
      return merged;
    },
    update: async ({ where, data }: any) => {
      const found = this.runs.get(where.id);
      const updated = {
        ...found,
        status: data.status,
        endedAt: data.endedAt,
        durationMs: data.durationMs,
        errorMessage: data.errorMessage,
        totalInputTokens: (found?.totalInputTokens ?? 0) + (data.totalInputTokens?.increment ?? 0),
        totalOutputTokens: (found?.totalOutputTokens ?? 0) + (data.totalOutputTokens?.increment ?? 0),
        totalCostUsd: (found?.totalCostUsd ?? 0) + (data.totalCostUsd?.increment ?? 0),
        totalToolCalls: (found?.totalToolCalls ?? 0) + (data.totalToolCalls?.increment ?? 0)
      };
      this.runs.set(where.id, updated);
      return updated;
    }
  };

  agentEvent = {
    findMany: async () => [],
    createMany: async ({ data }: any) => {
      this.events.push(...data);
      return { count: data.length };
    }
  };

  async $transaction(fn: (tx: FakePrisma) => Promise<unknown>) {
    return fn(this);
  }

  async $disconnect() {
    return;
  }
}

describe("POST /v1/ingest/events", () => {
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

  it("accepts optional agent_name and persists it", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/ingest/events",
      payload: {
        run: {
          run_id: "run_1",
          org_id: "org_1",
          agent_id: "agent_1",
          agent_name: "Customer Support Bot",
          source: "CUSTOM"
        },
        events: []
      }
    });

    expect(response.statusCode).toBe(202);
    expect(prisma.agents.get("agent_1")?.name).toBe("Customer Support Bot");
  });
});
