import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { createEventBus } from "../src/modules/events/bus";

class FakeRedis {
  private store = new Map<string, number>();

  async incr(key: string) {
    const next = (this.store.get(key) ?? 0) + 1;
    this.store.set(key, next);
    return next;
  }

  async expire(_key: string, _seconds: number) {
    return 1;
  }

  async get(key: string) {
    const current = this.store.get(key);
    return current ? String(current) : null;
  }

  async quit() {
    return "OK";
  }
}

class FakePrisma {
  private counter = 0;
  public rules: any[] = [];
  public thresholds: any[] = [];
  public budgets: any[] = [];
  public rateLimits: any[] = [];
  public audits: any[] = [];
  public approvals: any[] = [];

  auditEvent = {
    aggregate: async ({ where }: any) => {
      const list = this.audits.filter((audit) => {
        if (where.orgId && audit.orgId !== where.orgId) return false;
        if (where.agentId && audit.agentId !== where.agentId) return false;
        return true;
      });
      return {
        _sum: {
          costEstimateUsd: list.reduce((sum, item) => sum + (item.costEstimateUsd ?? 0), 0)
        }
      };
    },
    create: async ({ data }: any) => {
      const record = {
        id: `audit_${++this.counter}`,
        ...data
      };
      this.audits.push(record);
      return record;
    }
  };

  policyRule = {
    findMany: async ({ where }: any) => this.rules.filter((rule) => rule.orgId === where.orgId)
  };

  approvalThreshold = {
    findMany: async ({ where }: any) => this.thresholds.filter((threshold) => threshold.orgId === where.orgId)
  };

  budgetLimit = {
    findFirst: async ({ where }: any) =>
      this.budgets
        .filter((budget) => budget.orgId === where.orgId && budget.agentId === where.agentId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
  };

  rateLimitPolicy = {
    findFirst: async ({ where }: any) =>
      this.rateLimits
        .filter((rateLimit) => rateLimit.orgId === where.orgId && rateLimit.agentId === where.agentId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
  };

  approvalRequest = {
    create: async ({ data }: any) => {
      const record = {
        id: `approval_${++this.counter}`,
        requestedAt: new Date(),
        ...data
      };
      this.approvals.push(record);
      return record;
    }
  };

  async $disconnect() {
    return;
  }
}

describe("POST /v1/evaluate", () => {
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

  it("allows when no policy blocks invocation", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      payload: {
        org_id: "org_1",
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0.01
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.decision).toBe("ALLOW");
    expect(prisma.audits).toHaveLength(1);
  });

  it("requires approval when threshold is exceeded", async () => {
    prisma.thresholds.push({
      id: "th_1",
      orgId: "org_1",
      agentId: "agent_1",
      toolName: "stripe",
      toolAction: "refund",
      amountUsd: 50,
      createdAt: new Date()
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      payload: {
        org_id: "org_1",
        agent_id: "agent_1",
        tool_name: "stripe",
        tool_action: "refund",
        cost_estimate_usd: 75
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.decision).toBe("REQUIRE_APPROVAL");
    expect(prisma.approvals).toHaveLength(1);
  });

  it("denies when matching deny rule exists", async () => {
    prisma.rules.push({
      id: "rule_1",
      orgId: "org_1",
      agentId: null,
      toolName: "stripe",
      toolAction: "refund",
      effect: "DENY",
      priority: 1,
      reason: "Block refunds"
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      payload: {
        org_id: "org_1",
        agent_id: "agent_2",
        tool_name: "stripe",
        tool_action: "refund",
        cost_estimate_usd: 10
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.decision).toBe("DENY");
  });
});
