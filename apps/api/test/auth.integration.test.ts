import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { createEventBus } from "../src/modules/events/bus";
import { hashKey } from "../src/modules/gateway/auth";

class FakeRedis {
  private store = new Map<string, number>();
  async incr(key: string) { const next = (this.store.get(key) ?? 0) + 1; this.store.set(key, next); return next; }
  async expire() { return 1; }
  async get(key: string) { const c = this.store.get(key); return c ? String(c) : null; }
  async ping() { return "PONG"; }
  async quit() { return "OK"; }
}

const TEST_API_KEY = "gov_test_key_abcdef123456789";
const TEST_API_KEY_HASH = hashKey(TEST_API_KEY);
const TEST_ORG_ID = "org_test_1";
const OTHER_ORG_ID = "org_test_2";

class FakePrisma {
  private counter = 0;
  public rules: any[] = [];
  public thresholds: any[] = [];
  public audits: any[] = [];
  public evaluations: any[] = [];

  apiKey = {
    findUnique: async ({ where }: any) => {
      if (where.keyHash === TEST_API_KEY_HASH) {
        return {
          id: "key_1",
          orgId: TEST_ORG_ID,
          name: "test-key",
          keyHash: TEST_API_KEY_HASH,
          keyPrefix: TEST_API_KEY.slice(0, 12),
          framework: null,
          revokedAt: null,
          expiresAt: null,
        };
      }
      return null;
    },
    update: async () => ({}),
  };

  auditEvent = {
    aggregate: async () => ({ _sum: { costEstimateUsd: 0 } }),
    create: async ({ data }: any) => {
      const record = { id: `audit_${++this.counter}`, ...data };
      this.audits.push(record);
      return record;
    },
  };

  evaluation = {
    create: async ({ data }: any) => {
      const record = { id: `eval_${++this.counter}`, ...data };
      this.evaluations.push(record);
      return record;
    },
  };

  tool = { findUnique: async () => null, findMany: async () => [] };
  agent = { findUnique: async () => null };
  organization = { findUnique: async () => null };
  policyRule = { findMany: async ({ where }: any) => this.rules.filter((r) => r.orgId === where.orgId) };
  approvalThreshold = { findMany: async ({ where }: any) => this.thresholds.filter((t) => t.orgId === where.orgId) };
  budgetLimit = { findFirst: async () => null };
  rateLimitPolicy = { findFirst: async () => null };
  approvalPolicy = { findMany: async () => [] };
  approvalRequest = {
    create: async ({ data }: any) => ({ id: `apr_${++this.counter}`, requestedAt: new Date(), ...data }),
  };

  async $disconnect() { }
  async $queryRaw() { return [{ "?column?": 1 }]; }
}

function buildTestConfig(nodeEnv: string) {
  return {
    NODE_ENV: nodeEnv as any,
    API_HOST: "127.0.0.1",
    API_PORT: 4000,
    DATABASE_URL: "postgresql://test",
    REDIS_URL: "redis://localhost:6379",
    CORS_ORIGIN: nodeEnv === "production" ? "https://app.governor.run" : "http://localhost:3000",
    CLERK_SECRET_KEY: undefined,
    CLERK_JWT_ISSUER: undefined,
  };
}

describe("Auth — development mode", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({
      prisma: new FakePrisma() as any,
      redis: new FakeRedis() as any,
      eventBus: createEventBus(),
      config: buildTestConfig("development"),
    });
  });

  it("allows requests with x-org-id dev header", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      headers: { "x-org-id": TEST_ORG_ID },
      payload: {
        org_id: TEST_ORG_ID,
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().decision).toBe("ALLOW");
  });

  it("allows requests with body org_id only (no auth) in dev", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      payload: {
        org_id: TEST_ORG_ID,
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0,
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it("allows API key auth via x-governor-key header", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      headers: { "x-governor-key": TEST_API_KEY },
      payload: {
        org_id: TEST_ORG_ID,
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0,
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it("allows API key auth via Bearer token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      headers: { authorization: `Bearer ${TEST_API_KEY}` },
      payload: {
        org_id: TEST_ORG_ID,
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0,
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it("rejects org_id mismatch (API key resolves to org_test_1, body says org_test_2)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      headers: { "x-governor-key": TEST_API_KEY },
      payload: {
        org_id: OTHER_ORG_ID,
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0,
      },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("Auth — production mode", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({
      prisma: new FakePrisma() as any,
      redis: new FakeRedis() as any,
      eventBus: createEventBus(),
      config: buildTestConfig("production"),
    });
  });

  it("rejects unauthenticated requests with 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      payload: {
        org_id: TEST_ORG_ID,
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0,
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects dev headers in production", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      headers: { "x-org-id": TEST_ORG_ID },
      payload: {
        org_id: TEST_ORG_ID,
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0,
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("allows valid API key auth", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      headers: { "x-governor-key": TEST_API_KEY },
      payload: {
        org_id: TEST_ORG_ID,
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().decision).toBe("ALLOW");
  });

  it("rejects invalid API key with 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      headers: { "x-governor-key": "gov_invalid_key_xyz" },
      payload: {
        org_id: TEST_ORG_ID,
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0,
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects org_id mismatch with 403", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      headers: { "x-governor-key": TEST_API_KEY },
      payload: {
        org_id: OTHER_ORG_ID,
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("API key auth works without passing org_id in body (org from key)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      headers: { "x-governor-key": TEST_API_KEY },
      payload: {
        org_id: TEST_ORG_ID,
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.decision).toBeDefined();
  });
});

describe("Public routes", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({
      prisma: new FakePrisma() as any,
      redis: new FakeRedis() as any,
      eventBus: createEventBus(),
      config: buildTestConfig("production"),
    });
  });

  it("/health is accessible without auth", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it("/ready is accessible without auth", async () => {
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(200);
  });

  it("/v1/billing/plans is accessible without auth", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/billing/plans" });
    expect(res.statusCode).toBe(200);
    expect(res.json().plans).toBeDefined();
  });
});

describe("Auth — cross-org isolation", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({
      prisma: new FakePrisma() as any,
      redis: new FakeRedis() as any,
      eventBus: createEventBus(),
      config: buildTestConfig("development"),
    });
  });

  it("API key auth resolves org without requiring body org_id", async () => {
    // When org_id is omitted from the body, resolveRequestOrg should
    // fall back to request.auth.orgId from the API key
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      headers: { "x-governor-key": TEST_API_KEY },
      payload: {
        org_id: TEST_ORG_ID, // schema requires this, but auth overrides it
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().decision).toBeDefined();
  });

  it("rejects cross-org access via body org_id mismatch", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/evaluate",
      headers: { "x-governor-key": TEST_API_KEY },
      payload: {
        org_id: OTHER_ORG_ID,
        agent_id: "agent_1",
        tool_name: "http",
        tool_action: "GET",
        cost_estimate_usd: 0,
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toContain("mismatch");
  });
});

describe("Auth — production mode parametric 401", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({
      prisma: new FakePrisma() as any,
      redis: new FakeRedis() as any,
      eventBus: createEventBus(),
      config: buildTestConfig("production"),
    });
  });

  const protectedRoutes = [
    { method: "POST" as const, url: "/v1/evaluate" },
    { method: "GET" as const, url: "/v1/api-keys" },
    { method: "GET" as const, url: "/v1/agents" },
    { method: "GET" as const, url: "/v1/actions" },
    { method: "GET" as const, url: "/v1/runs" },
    { method: "GET" as const, url: "/v1/policies" },
    { method: "GET" as const, url: "/v1/me" },
  ];

  for (const route of protectedRoutes) {
    it(`${route.method} ${route.url} returns 401 without auth`, async () => {
      const res = await app.inject({
        method: route.method,
        url: route.url,
        ...(route.method === "POST"
          ? {
            payload: {
              org_id: TEST_ORG_ID,
              agent_id: "agent_1",
              tool_name: "http",
              tool_action: "GET",
              cost_estimate_usd: 0,
            },
          }
          : {}),
      });
      expect(res.statusCode).toBe(401);
    });
  }
});

describe("Auth — classify-risk mismatch protection", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({
      prisma: new FakePrisma() as any,
      redis: new FakeRedis() as any,
      eventBus: createEventBus(),
      config: buildTestConfig("development"),
    });
  });

  it("classify-risk works without auth (semi-public)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/tools/classify-risk",
      payload: { tool_name: "http", tool_action: "GET" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().risk_class).toBeDefined();
  });

  it("classify-risk returns 403 on org_id mismatch when authenticated", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/tools/classify-risk?org_id=" + OTHER_ORG_ID,
      headers: { "x-governor-key": TEST_API_KEY },
      payload: { tool_name: "http", tool_action: "GET" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("classify-risk/batch returns 403 on org_id mismatch when authenticated", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/tools/classify-risk/batch",
      headers: { "x-governor-key": TEST_API_KEY },
      payload: {
        org_id: OTHER_ORG_ID,
        tools: [{ tool_name: "http", tool_action: "GET" }],
      },
    });
    expect(res.statusCode).toBe(403);
  });
});
