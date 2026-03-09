# Governor

Governor is an AI Governance Control Tower for tool-using AI agents. It sits between your AI agents and the tools they invoke, enforcing policy decisions in real time while capturing full telemetry for observability and compliance.

It works with agents built on **any framework** — LangChain, CrewAI, AutoGen, n8n, Zapier, MindStudio, Vertex AI, Copilot Studio, or custom SDKs — and provides a unified governance, approval, and audit layer.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Your AI Application                         │
│                                                                    │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐       │
│  │ LangChain│   │ CrewAI   │   │ n8n      │   │ Custom   │       │
│  │  Agent   │   │  Agent   │   │  Agent   │   │  Agent   │       │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘       │
│       │              │              │              │               │
│       └──────────────┴──────┬───────┴──────────────┘               │
│                             │                                      │
│                    @governor/sdk                                    │
│                   wrapTool() gateway                               │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
                    evaluate + audit + ingest
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Governor Platform                             │
│                                                                    │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐   │
│  │   Policy Engine      │   │         Fastify API               │   │
│  │                     │   │                                  │   │
│  │  Conditions DSL     │   │  /v1/evaluate    /v1/tools       │   │
│  │  Risk classification│   │  /v1/policies    /v1/audit-log   │   │
│  │  Enforcement modes  │   │  /v1/approvals   /v1/metrics     │   │
│  │  Version + compile  │   │  /v1/webhooks    /v1/ingest      │   │
│  └─────────────────────┘   └──────────────────────────────────┘   │
│                                                                    │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐   │
│  │   PostgreSQL 16     │   │          Redis 7                 │   │
│  │   (Supabase)        │   │                                  │   │
│  │  Evaluations        │   │  Rate limit counters             │   │
│  │  Audit logs         │   │  SSE pub/sub                    │   │
│  │  Policy versions    │   │  Budget spend cache             │   │
│  │  Tool registry      │   │                                  │   │
│  └─────────────────────┘   └──────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Console (Next.js 15)                         │  │
│  │                                                              │  │
│  │  Overview Dashboard  │  Run Explorer    │  Policy Studio v2  │  │
│  │  Tool Registry       │  Approvals Inbox │  Audit Explorer    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Current Status

> **Live deployment (March 2026):** API and Console are deployed on Vercel with Supabase for authentication and database.

### ✅ What Works

| Component | Status | Details |
|-----------|--------|---------|
| **API (Fastify)** | ✅ Deployed | Running on Vercel Serverless Functions, all 22 API modules active |
| **Console (Next.js)** | ✅ Deployed | Running on Vercel, all pages render |
| **Authentication** | ✅ Working | Supabase Auth (email/password sign-up and sign-in) |
| **Auth Guard** | ✅ Working | Middleware redirects unauthenticated users to /sign-in |
| **Database** | ✅ Connected | Supabase PostgreSQL via Prisma ORM |
| **Policy Engine** | ✅ Working | Pure TypeScript, conditions DSL, compile, explain, diff |
| **SDK** | ✅ Published | `@governor/sdk` with `protectAgent()`, `wrapTool()`, adapters |
| **CLI** | ✅ Published | `@governor/cli` with init, inspect, simulate, actions |
| **API Root & Health** | ✅ Working | `GET /` returns server info, `GET /health` returns OK |
| **Risk Classification** | ✅ Working | Semantic taxonomy with auto-classify heuristics |

### ⚠️ Known Issues / In Progress

| Issue | Details |
|-------|---------|
| **Console pages show empty state** | Some dashboard pages (Overview, Agents, Tools, etc.) show empty data because the database hasn't been seeded with demo data on production yet. The API endpoints behind them work correctly. |
| **Redis not connected on Vercel** | Rate limiting, SSE streaming, and budget caching require Redis. These features degrade gracefully (the API still works) but real-time timeline and rate limits won't function without a Redis instance. |
| **Navigation after sign-up** | After creating an account and signing in, the org is auto-provisioned from the Supabase user ID. If the first page shows "Generate API Key," this is the quickstart flow working as intended — the user needs to create API keys to start using Governor. |
| **`CORS_ORIGIN` configuration** | Must be set on the API Vercel project to match the Console URL, otherwise browser requests from the console to the API will be blocked. |

### ❌ Not Yet Implemented

| Feature | Notes |
|---------|-------|
| **Marketing / landing page** | Root URL (`/`) redirects directly to `/sign-in`. No public-facing marketing page exists yet. |
| **Email verification flow** | Supabase sends confirmation emails on sign-up, but the redirect URL may need configuration in Supabase Dashboard. |
| **Password reset** | No "Forgot Password" flow implemented in the console UI yet. |
| **Organization management UI** | Orgs are auto-provisioned from user ID. No UI for creating/switching orgs. |
| **Billing integration** | Billing page exists in the UI but has no real payment processing. |
| **Webhook delivery** | Webhook endpoints exist in the API but outbound delivery is not wired to a job runner. |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | Node.js 22, Fastify 5, TypeScript 5.9 |
| **Database** | PostgreSQL 16 (Supabase), Prisma 6 ORM |
| **Cache / Pub-Sub** | Redis 7 (optional — degrades gracefully) |
| **Frontend** | Next.js 15.2.6 (App Router), CSS, Recharts |
| **Auth** | Supabase Auth (email/password) via `@supabase/ssr` |
| **Deployment** | Vercel (Serverless Functions for API, Edge for Console) |
| **Monorepo** | pnpm 9 workspaces + Turborepo |
| **Build** | tsup (API), Next.js (Console) |

---

## Quick Start — Local Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose (for local Postgres + Redis)

### 1. Install and Start

```bash
git clone https://github.com/kittu54/governor
cd governor
cp .env.example .env
make bootstrap    # installs deps, starts Postgres + Redis, runs migrations
make dev          # starts API on :4000 and Console on :3000
```

### 2. Protect Your Agent

```typescript
import { protectAgent } from "@governor/sdk";

const agent = protectAgent({
  "stripe.refund": issueRefund,
  "email.send": sendEmail,
  "shell.exec": runShell,
  "database.query": queryDB,
});

// Every tool call is now governed
await agent.call("stripe.refund", { order_id: "ord_123", amount: 500 });
// → REQUIRE_APPROVAL (MONEY_MOVEMENT > $200)

await agent.call("shell.exec", { command: "rm -rf /" });
// → DENIED (CODE_EXECUTION blocked by firewall)

await agent.call("database.query", { sql: "SELECT * FROM users" });
// → ALLOWED (LOW_RISK, audited)
```

### 3. Review Actions

Open the Console at **http://localhost:3000** to see every governed action.

No policies needed. No configuration required. The AI Action Firewall protects your agents immediately.

---

## Deployment (Vercel + Supabase)

Both the API and Console are deployed as separate Vercel projects from the same GitHub monorepo.

### Vercel Project Setup

| Vercel Project | Root Directory | Framework |
|----------------|---------------|-----------|
| `governor-api` | `apps/api` | Other (Fastify) |
| `console` | `apps/console` | Next.js |

Each project has a `vercel.json` that specifies pnpm build commands for the monorepo.

### Required Environment Variables

#### API Project (`governor-api`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string |
| `SUPABASE_JWT_SECRET` | Yes | Supabase Dashboard → Project Settings → API → JWT Secret |
| `CORS_ORIGIN` | Yes | Console URL (e.g. `https://console-xxx.vercel.app`) |
| `REDIS_URL` | No | Redis connection string (rate limits, SSE, budget cache) |
| `NODE_ENV` | No | `production` (auto-set by Vercel) |

#### Console Project (`console`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Dashboard → Project Settings → API → `anon` key |
| `NEXT_PUBLIC_API_BASE_URL` | No | API URL (defaults to `https://agentgovernor.vercel.app` in prod) |

#### SDK / Agent Configuration

| Variable | Description |
|----------|-------------|
| `GOVERNOR_API_BASE_URL` | API URL for SDK clients (default: `http://localhost:4000`) |
| `GOVERNOR_API_KEY` | API authentication key |
| `GOVERNOR_ORG_ID` | Organization ID for SDK context |
| `GOVERNOR_AGENT_ID` | Agent ID for SDK context |
| `GOVERNOR_ENVIRONMENT` | Enforcement mode (`DEV`, `STAGING`, `PROD`) |
| `GOVERNOR_ON_ERROR` | Behavior if Governor is unreachable (`throw`, `allow`, `deny`) |

---

## AI Action Firewall

Governor includes a zero-configuration protection layer that activates automatically:

| Risk Class | Default Action | Examples |
|------------|---------------|---------|
| `CODE_EXECUTION` | **Deny** | `shell.exec`, `eval.run` |
| `CREDENTIAL_USE` | **Deny** | `vault.get`, `secrets.read` |
| `FILE_MUTATION` (delete) | **Deny** | `fs.delete`, `file.delete` |
| `MONEY_MOVEMENT` > $200 | **Require Approval** | `stripe.refund`, `paypal.transfer` |
| `DATA_EXPORT` | **Require Approval** | `s3.export`, `data.download` |
| `EXTERNAL_COMMUNICATION` | **Require Approval** | `email.send`, `slack.message` |
| `ADMIN_ACTION` | **Require Approval** | `admin.delete`, `iam.grant` |
| `PII_ACCESS` | **Require Approval** | `customer.lookup_pii` |
| `DATA_WRITE` | **Allow + Audit** | `postgres.update`, `mongo.insert` |
| `LOW_RISK` | **Allow + Audit** | `database.read`, `cache.get` |

Override any rule by adding your own policies in Policy Studio.

---

## Monorepo Structure

```
governor/
├── apps/
│   ├── api/              Fastify API — 22 feature modules
│   │   ├── src/modules/  actions, agents, alerts, apikeys, approvals, audit,
│   │   │                 auditlog, billing, events, firewall, gateway, ingest,
│   │   │                 mcp, me, metrics, onboarding, policies, policy,
│   │   │                 runs, simulation, tools, webhooks
│   │   ├── prisma/       Database schema + migrations
│   │   └── vercel.json   Vercel deployment config
│   │
│   └── console/          Next.js 15 visual control tower
│       ├── src/app/      App Router pages
│       ├── src/lib/      Supabase clients, API helpers, auth
│       └── vercel.json   Vercel deployment config
│
├── packages/
│   ├── sdk/              @governor/sdk — protectAgent, wrapTool, adapters
│   ├── cli/              @governor/cli — init, inspect, simulate, rules
│   ├── policy-engine/    Pure TS policy evaluation, conditions DSL, compile
│   └── shared/           Shared types, Zod schemas, risk taxonomy, contracts
│
├── examples/             Integration examples (OpenAI, LangChain, MCP, internal)
├── docker-compose.yml    Postgres + Redis (local dev)
├── Makefile              Bootstrap and dev lifecycle commands
└── turbo.json            Turborepo build orchestration
```

---

## Console Pages

| Page | Path | Status | Description |
|------|------|--------|-------------|
| **Sign In** | `/sign-in` | ✅ Working | Supabase email/password authentication |
| **Sign Up** | `/sign-up` | ✅ Working | Account creation with email confirmation |
| **Overview** | `/overview` | ✅ Renders | KPI cards, risk distribution, cost metrics, 7-day trajectory |
| **Actions** | `/actions` | ✅ Renders | Governed tool invocations with risk classification |
| **Approvals** | `/approvals` | ✅ Renders | Inbox with approve/deny/escalate/comment |
| **Policy Studio** | `/policy-studio` | ✅ Renders | Versioned policy management, simulator |
| **Tool Registry** | `/tools` | ✅ Renders | Register tools, auto-classify risk |
| **MCP Servers** | `/mcp` | ✅ Renders | MCP server registry, tool discovery |
| **Audit Explorer** | `/audit` | ✅ Renders | Entity-level audit log with search |
| **Agents** | `/agents` | ✅ Renders | Agent registry with framework/environment |
| **Agent Detail** | `/agents/:id` | ✅ Renders | Agent KPIs, linked policies, recent runs |
| **Run Explorer** | `/runs` | ✅ Renders | Filterable run table with status/provider/cost |
| **Run Detail** | `/runs/:id` | ✅ Renders | Event timeline, cost analysis |
| **Live Timeline** | `/timeline` | ⚠️ Needs Redis | Real-time SSE event stream |
| **Alerts** | `/alerts` | ✅ Renders | Alert rules and notification management |
| **Integrations** | `/integrations` | ✅ Renders | API keys and framework detection |
| **Settings** | `/settings` | ✅ Renders | General, profile, billing, API keys tabs |
| **Billing** | `/billing` | ⚠️ UI Only | No real payment processing |
| **Docs** | `/docs` | ✅ Working | Inline API documentation |
| **Quickstart** | `/quickstart` | ✅ Working | Onboarding flow for new users |

---

## SDK Usage

### Installation

```ts
import { createGovernor, createGovernorFromEnv } from "@governor/sdk";

// Explicit configuration
const gov = createGovernor({
  api_base_url: "https://your-governor-api.vercel.app",
  org_id: "org_acme",
  agent_id: "agent_support_1",
  api_key: "your-api-key",
  environment: "PROD",
  on_error: "deny",
});

// Or from environment variables
const gov = createGovernorFromEnv();
```

### Governance Gateway

```ts
const refund = gov.wrapTool({
  tool_name: "stripe",
  tool_action: "refund",
  handler: async (payload: { amount_usd: number; charge_id: string }) => {
    return await stripe.refunds.create({
      charge: payload.charge_id,
      amount: payload.amount_usd * 100,
    });
  },
  costEstimator: (payload) => payload.amount_usd * 0.0002,
});

// Every call is governed: classify → evaluate → execute → audit
await refund({ amount_usd: 75, charge_id: "ch_abc123" });
```

### Error Handling

```ts
import { GovernorDeniedError, GovernorApprovalRequiredError } from "@governor/sdk";

try {
  await refund({ amount_usd: 500, charge_id: "ch_xyz" });
} catch (error) {
  if (error instanceof GovernorDeniedError) {
    console.log("Denied:", error.reason, "Risk:", error.risk_class);
  } else if (error instanceof GovernorApprovalRequiredError) {
    console.log("Approval needed:", error.approval_request_id);
  }
}
```

### Provider Adapters (Telemetry)

```ts
const run = gov.adapters.openai("run_ticket_001", {
  model: "gpt-4.1-mini",
  task_name: "ticket_triage",
});

await run.start();
await run.modelCall({ prompt: "Classify this ticket..." });
await run.modelResult({ input_tokens: 900, output_tokens: 140, cost_usd: 0.01 });
await run.complete();
```

| Adapter | Method |
|---------|--------|
| OpenAI | `gov.adapters.openai(runId, opts)` |
| Anthropic | `gov.adapters.claude(runId, opts)` |
| Gemini | `gov.adapters.gemini(runId, opts)` |
| LangChain | `gov.adapters.langchain(runId, opts)` |

---

## API Endpoints (Summary)

### Governance
- `POST /v1/evaluate` — Evaluate a tool call against policies
- `POST /v1/evaluate/simulate` — Dry-run evaluation (no side effects)
- `POST /v1/evaluate/explain` — Human-readable evaluation explanation

### Policies (v2 — Versioned)
- `GET /v1/policies/v2` — List policies
- `POST /v1/policies/v2` — Create policy
- `POST /v1/policies/v2/:id/versions` — Create version
- `POST /v1/policies/v2/versions/:id/publish` — Publish version
- `POST /v1/policies/v2/versions/:id/rollback-target` — Rollback
- `GET /v1/policies/v2/versions/:a/diff/:b` — Diff versions
- `POST /v1/policies/v2/validate` — Validate definition

### Tools
- `GET /v1/tools` — List tools
- `POST /v1/tools` — Register/upsert tool
- `POST /v1/tools/classify-risk` — Auto-classify risk
- `POST /v1/tools/classify-risk/batch` — Batch classify
- `GET /v1/tools/risk-classes` — Risk class reference

### Approvals
- `GET /v1/approvals` — List approval requests
- `POST /v1/approvals/:id/approve` — Approve
- `POST /v1/approvals/:id/deny` — Deny
- `POST /v1/approvals/:id/escalate` — Escalate
- `POST /v1/approvals/bulk` — Bulk actions (up to 100)

### MCP Servers
- `CRUD /v1/mcp/servers` — Register, list, update, delete MCP servers
- `POST /v1/mcp/servers/:id/sync` — Discover and classify MCP tools

### Simulation
- `POST /v1/simulation/simulate` — Single evaluation simulation
- `POST /v1/simulation/simulate-historical` — Historical blast radius

### Audit & Telemetry
- `GET /v1/audit-log` — Entity-level audit trail
- `GET /v1/audit/events` — Governance decision records
- `GET /v1/audit-log/verify` — Hash chain integrity check
- `POST /v1/ingest/events` — Ingest run + events
- `GET /v1/runs` / `GET /v1/runs/:id` — Run explorer

### Metrics
- `GET /v1/metrics/overview` — Dashboard KPIs
- `GET /v1/metrics/risk-classes` — By risk class
- `GET /v1/metrics/costs` — Cost breakdown
- `GET /v1/metrics/governance` — Blocked actions, spend prevented, trends
- `GET /v1/metrics/tools` — Per-tool metrics

### Other
- `GET /v1/webhooks` / `POST /v1/webhooks` — Webhook management
- `GET /v1/events/stream` — SSE real-time stream
- `GET /health` — Health check
- `GET /ready` — Readiness check (DB connectivity)

---

## Risk Classification

| Risk Class | Severity | Examples |
|------------|----------|---------|
| `MONEY_MOVEMENT` | Critical (95) | `stripe.refund`, `paypal.transfer` |
| `CODE_EXECUTION` | Critical (90) | `shell.exec`, `docker.run` |
| `ADMIN_ACTION` | Critical (90) | `iam.grant`, `k8s.deploy` |
| `CREDENTIAL_USE` | Critical (85) | `vault.read`, `aws.assume_role` |
| `PII_ACCESS` | High (85) | `customer.lookup`, `user.get_pii` |
| `EXTERNAL_COMMUNICATION` | High (80) | `gmail.send`, `twilio.sms` |
| `DATA_EXPORT` | High (75) | `s3.export`, `bigquery.export` |
| `FILE_MUTATION` | Medium (75) | `fs.delete`, `s3.delete` |
| `DATA_WRITE` | Medium (60) | `postgres.update`, `mongo.insert` |
| `LOW_RISK` | Low (10) | `http.GET`, `cache.read` |

---

## Policy Evaluation Pipeline

```
Tool call → Risk Classify → Sensitivity Check → Budget Check
  → Rate Limit → Explicit DENY Rules → Approval Check
  → Allow Rules → Default Decision (mode-dependent)
```

Every evaluation returns a **decision trace** showing each step the engine considered.

### Enforcement Modes

| Mode | Sensitive Actions | Non-Sensitive | `would_deny_in_prod` |
|------|-------------------|---------------|----------------------|
| `DEV` | Allow + warn | Allow | `true` for sensitive |
| `STAGING` | Allow + warn | Allow | `true` for sensitive |
| `PROD` | Deny (unless explicit ALLOW) | Default allow | N/A |

---

## Development

### Make Commands

| Command | Description |
|---------|-------------|
| `make bootstrap` | Full init (install, infra, db, seed, test) |
| `make dev` | Start API (:4000) + Console (:3000) |
| `make install` | `pnpm install --frozen-lockfile` |
| `make infra` | Start Postgres + Redis containers |
| `make prisma-generate` | Generate Prisma client |
| `make prisma-migrate` | Run database migrations |
| `make seed` | Populate demo seed data |
| `make test` | Build and run all tests |
| `make down` | Stop Docker containers |

### Testing

```bash
# Policy engine unit tests (131 tests)
pnpm --filter @governor/policy-engine test

# API integration tests
pnpm --filter @governor/api test
```

### Docker Compose (Local Dev)

| Service | Image | Port |
|---------|-------|------|
| `postgres` | `postgres:16-alpine` | 5432 |
| `redis` | `redis:7-alpine` | 6379 |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Supabase client unavailable" on sign-in | Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on Vercel console project |
| CORS errors from console → API | Set `CORS_ORIGIN` on API Vercel project to your console URL |
| Empty dashboard pages | Database needs seed data — run `make seed` locally or use the SDK to send real data |
| `REDIS_URL` missing warnings | Redis is optional — rate limits and SSE degrade gracefully without it |
| Prisma client not generated | Run `make prisma-generate` or `pnpm db:generate` |
| Next.js stale cache | Delete `apps/console/.next` and restart |
| Vercel build TS errors | Vercel uses stricter TypeScript — ensure all types are explicit |

---

## Roadmap

### Completed ✅
- Full Supabase authentication (email/password sign-up, sign-in, session management)
- Middleware auth guard (unauthenticated redirect to /sign-in)
- Vercel deployment (API + Console as separate projects)
- Clerk removal — fully migrated to Supabase-only auth
- Next.js 15.2.6 (patched CVE-2025-29927 + CVE-2025-66478)
- Policy engine with conditions DSL, versioning, compile, diff
- Policy simulation (single + historical blast radius)
- MCP server governance (registry, tool discovery, auto-classification)
- Advanced approval workflows (chains, escalation, bulk actions)
- AI Action Firewall with zero-config risk classification
- Audit hash chaining + integrity verification
- SDK with `protectAgent()`, `wrapTool()`, provider adapters
- CLI with init, inspect, simulate, actions, rules
- 22 API modules with full CRUD
- Console with 20+ pages

### Next Up 🚧
- **Production seed data** — populate dashboard with realistic demo data on Vercel
- **Redis integration** — connect a hosted Redis instance for rate limits, SSE, budget caching
- **Password reset flow** — "Forgot Password" UI + Supabase reset email
- **Email verification redirect** — configure Supabase to redirect to console after email confirmation
- **Organization management UI** — create/switch orgs, invite team members
- **Marketing landing page** — public homepage with product overview
- **Webhook delivery worker** — background job runner for outbound webhook delivery
- **API key management UX** — full create/revoke/rotate flow in Settings

### Future 🔮
- **Billing integration** — Stripe for paid plans (usage-based pricing)
- **SSO / SAML** — Enterprise authentication
- **Slack / PagerDuty / Jira** — Approval and incident connectors
- **Data warehouse export** — Snowflake/BigQuery for FinOps and compliance
- **Model-backed analyst copilot** — RAG over governance data
- **Policy pack marketplace** — installable rule + risk mapping bundles
- **Multi-region deployment** — geographic distribution blueprint
- **Provider-native middleware** — OpenAI, Anthropic, Gemini callbacks

---

## License

MIT
