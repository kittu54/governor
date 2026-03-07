# Governor

Governor is a visual-first AI Governance Control Tower for tool-using AI agents. It sits between your AI agents and the tools they invoke, enforcing policy decisions in real time while capturing full telemetry for observability and compliance.

## What Governor Does

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Your AI Application                         │
│                                                                    │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐       │
│  │ OpenAI   │   │ Anthropic│   │ Gemini   │   │LangChain │       │
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
│  │  Rules (ALLOW/DENY) │   │  /v1/evaluate    /v1/runs       │   │
│  │  Budget limits      │   │  /v1/audit       /v1/metrics    │   │
│  │  Rate limits        │   │  /v1/approvals   /v1/ingest     │   │
│  │  Approval thresholds│   │  /v1/policies    /v1/events     │   │
│  └─────────────────────┘   └──────────────────────────────────┘   │
│                                                                    │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐   │
│  │   PostgreSQL 16     │   │          Redis 7                 │   │
│  │                     │   │                                  │   │
│  │  Audit events       │   │  Rate limit counters             │   │
│  │  Runs & events      │   │  SSE pub/sub                    │   │
│  │  Policies & rules   │   │  Budget spend cache             │   │
│  │  Approval requests  │   │                                  │   │
│  └─────────────────────┘   └──────────────────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Console (Next.js 15)                         │  │
│  │                                                              │  │
│  │  Overview Dashboard  │  Run Explorer    │  Policy Studio     │  │
│  │  Live Timeline       │  Approvals Inbox │  Agent Analytics   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Core capabilities:**

- **Governance Gateway SDK** — wraps tool calls and enforces policy decisions before execution.
- **Policy Engine** — evaluates rules, budgets, rate limits, and approval thresholds with traceable `ALLOW`, `DENY`, and `REQUIRE_APPROVAL` decisions.
- **Full Audit Trail** — stores every governance decision, tool invocation, model call, and outcome.
- **Telemetry Ingestion** — captures run-level and event-level data from any AI provider.
- **Visual Console** — dashboards for operations, approvals, policy authoring, and run-level analytics.

## How Policy Evaluation Works

When an agent invokes a tool through the Governor SDK, the policy engine evaluates the call through a priority-ordered pipeline:

```
Tool call arrives
       │
       ▼
┌──────────────┐     Budget exceeded?
│ Budget Check │────── YES ──▶ DENY (org or agent daily limit exceeded)
└──────┬───────┘
       │ NO
       ▼
┌──────────────┐     Calls ≥ limit?
│ Rate Limit   │────── YES ──▶ DENY (rate limit exceeded)
└──────┬───────┘
       │ NO
       ▼
┌──────────────┐     Matching DENY rule?
│ Rule Match   │────── YES ──▶ DENY (blocked by rule)
│ (by priority)│
└──────┬───────┘
       │ NO
       ▼
┌──────────────┐     Cost > threshold?
│ Approval     │────── YES ──▶ REQUIRE_APPROVAL
│ Thresholds   │
└──────┬───────┘
       │ NO
       ▼
┌──────────────┐     Matching ALLOW rule?
│ Allow Rule   │────── YES ──▶ ALLOW (explicit rule)
└──────┬───────┘
       │ NO
       ▼
   DEFAULT ALLOW
```

Every evaluation returns a **decision trace** — an array of `DecisionTraceItem` objects showing each step the engine considered, enabling full auditability.

## Monorepo Structure

```
governor/
├── apps/
│   ├── api/              Fastify API service — policy, audit, ingest, metrics, approvals
│   │   ├── src/modules/  Feature modules (policy, audit, approvals, ingest, runs, metrics, events)
│   │   ├── prisma/       Database schema, migrations, and seed data
│   │   └── test/         Integration tests
│   │
│   └── console/          Next.js 15 visual control tower
│       ├── src/app/      App Router pages (dashboard, runs, approvals, policy-studio, etc.)
│       └── src/components/ UI components (layout, charts, policy, timeline, approvals)
│
├── packages/
│   ├── sdk/              Integration SDK — wrapTool, telemetry, provider adapters
│   ├── policy-engine/    Pure TypeScript policy evaluation logic with unit tests
│   └── shared/           Shared types, Zod schemas, and validation contracts
│
├── docker-compose.yml    Postgres + Redis + API + Console containers
├── Makefile              Bootstrap and dev lifecycle commands
└── turbo.json            Turborepo build orchestration
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | Node.js 20+, Fastify 5, TypeScript |
| **Database** | PostgreSQL 16, Prisma 6 ORM |
| **Cache / Pub-Sub** | Redis 7 |
| **Frontend** | Next.js 15 (App Router), Tailwind CSS, Recharts |
| **Auth** | Clerk (with local-mode fallback for dev) |
| **Monorepo** | pnpm 9 workspaces + Turborepo |
| **Infra** | Docker Compose |

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose
- Colima or Docker Desktop running

## Quickstart

```bash
cp .env.example .env
make bootstrap
make dev
```

Then open:
- **Console:** http://localhost:3000
- **API:** http://localhost:4000
- **Health check:** http://localhost:4000/health

### What `make bootstrap` Does

1. Ensures `.env` exists (copies from `.env.example` if missing).
2. Installs workspace dependencies with frozen lockfile.
3. Starts Postgres + Redis containers via Docker Compose.
4. Waits for Postgres readiness and creates the `governor` database.
5. Generates Prisma client, runs migrations, and seeds demo data.
6. Runs policy-engine unit tests and API integration tests.

### Demo Seed Data

The seed script populates realistic data for immediate exploration:

| Entity | Count | Details |
|--------|-------|---------|
| Organizations | 3 | Multi-tenant demo orgs |
| Agents | 5 | Across different orgs |
| Audit events | 2,000 | Governance decision records |
| Pending approvals | 20 | Awaiting action |
| Runs | 450 | Across OpenAI / Anthropic / Gemini / LangChain |
| Run events | Thousands | Token, cost, latency, and tool metadata |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Runtime environment |
| **API** | | | |
| `API_PORT` | No | `4000` | API server port |
| `API_HOST` | No | `0.0.0.0` | API server bind address |
| `API_BASE_URL` | No | `http://localhost:4000` | Public API URL |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | Yes | — | Redis connection string |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origins |
| `CLERK_SECRET_KEY` | No | — | Clerk backend key (placeholder = local mode) |
| `CLERK_PUBLISHABLE_KEY` | No | — | Clerk frontend key (placeholder = local mode) |
| `CLERK_JWT_ISSUER` | No | — | Clerk JWT issuer URL |
| **Console** | | | |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | — | API URL for browser requests |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | No | — | Clerk frontend key |
| **SDK** | | | |
| `GOVERNOR_API_BASE_URL` | No | `http://localhost:4000` | API URL for SDK clients |
| `GOVERNOR_API_KEY` | No | — | API authentication key |
| `GOVERNOR_ORG_ID` | Yes | — | Organization ID for SDK context |
| `GOVERNOR_AGENT_ID` | Yes | — | Agent ID for SDK context |
| `GOVERNOR_USER_ID` | No | — | User ID for SDK context |
| `GOVERNOR_SESSION_ID` | No | — | Session ID for SDK context |

## SDK Usage

### Installation

The SDK is a workspace package (`@governor/sdk`). In external projects, point to the API:

```ts
import { createGovernor, createGovernorFromEnv } from "@governor/sdk";

// Option 1: Explicit configuration
const gov = createGovernor({
  api_base_url: "https://your-governor.example.com",
  org_id: "org_acme",
  agent_id: "agent_support_1",
  api_key: "your-api-key"
});

// Option 2: From environment variables
const gov = createGovernorFromEnv();
```

### Governance Gateway — Wrapping Tools

The `wrapTool` function creates a governed version of any tool. Every call is evaluated against policies before execution, and the result is recorded in the audit trail:

```ts
const refund = gov.wrapTool({
  tool_name: "stripe",
  tool_action: "refund",
  handler: async (payload: { amount_usd: number; charge_id: string }) => {
    return await stripe.refunds.create({ charge: payload.charge_id, amount: payload.amount_usd * 100 });
  },
  costEstimator: (payload) => payload.amount_usd * 0.0002,
  inputSummarizer: (payload) => `refund $${payload.amount_usd} on ${payload.charge_id}`,
  outputSummarizer: (result) => `refund ${result.id} created`
});

// This call will:
//   1. Evaluate policies (rules, budgets, rate limits, thresholds)
//   2. If ALLOW → execute handler → record SUCCESS in audit
//   3. If DENY → throw GovernorDeniedError (handler never executes)
//   4. If REQUIRE_APPROVAL → throw GovernorApprovalRequiredError
await refund({ amount_usd: 75, charge_id: "ch_abc123" });
```

### Handling Governance Decisions

```ts
import { GovernorDeniedError, GovernorApprovalRequiredError } from "@governor/sdk";

try {
  await refund({ amount_usd: 500, charge_id: "ch_xyz" });
} catch (error) {
  if (error instanceof GovernorDeniedError) {
    // Policy blocked this call — inspect the trace for details
    console.log("Denied:", error.trace);
  } else if (error instanceof GovernorApprovalRequiredError) {
    // Requires manual approval — store the approval_request_id
    console.log("Approval needed:", error.approval_request_id);
    // Show UI to the user, or queue for later
  } else {
    // Tool handler itself threw an error (recorded as ERROR in audit)
    throw error;
  }
}
```

### Convenience Wrappers

```ts
// Governed fetch — wraps any HTTP call through the governance gateway
const governedFetch = gov.wrapFetch();
const response = await governedFetch("https://api.example.com/data");

// Governed OpenAI function call tool
const searchTool = gov.wrapOpenAITool("web_search", async (args: { query: string }) => {
  return await searchEngine.search(args.query);
});

// Governed LangChain tool
const calcTool = gov.wrapLangChainTool("calculator", async (args: { expression: string }) => {
  return eval(args.expression); // simplified example
});
```

### Telemetry — Run Lifecycle Tracking

Capture full execution traces from any AI provider:

```ts
// Create a telemetry run with a provider adapter
const run = gov.adapters.openai("run_ticket_001", {
  model: "gpt-4.1-mini",
  task_name: "ticket_triage",
  tags: ["support", "tier-1"],
  metadata: { customer_id: "cust_abc" }
});

await run.start();

// Track model calls
await run.modelCall({ prompt: "Classify this support ticket: ..." });
await run.modelResult({
  input_tokens: 900,
  output_tokens: 140,
  cost_usd: 0.01,
  latency_ms: 740,
  output_payload: { classification: "billing" }
});

// Track tool calls
await run.toolCall({ tool_name: "zendesk", tool_action: "update_ticket", input_payload: { priority: "high" } });
await run.toolResult({ tool_name: "zendesk", tool_action: "update_ticket", status: "SUCCESS", latency_ms: 120 });

// Finalize
await run.complete({ resolution: "escalated_to_billing" });

// Or if something goes wrong:
// await run.fail(new Error("API timeout"), { retry_count: 3 });
```

**Available provider adapters:**

| Adapter | Source | Default Provider |
|---------|--------|-----------------|
| `gov.adapters.openai(runId, opts)` | `OPENAI` | `openai` |
| `gov.adapters.claude(runId, opts)` | `ANTHROPIC` | `anthropic` |
| `gov.adapters.gemini(runId, opts)` | `GEMINI` | `google` |
| `gov.adapters.langchain(runId, opts)` | `LANGCHAIN` | `langchain` |

## API Reference

### Governance

#### `POST /v1/evaluate` — Evaluate a tool call against policies

**Request:**
```json
{
  "org_id": "org_acme",
  "agent_id": "agent_support_1",
  "tool_name": "stripe",
  "tool_action": "refund",
  "cost_estimate_usd": 0.015,
  "user_id": "user_123",
  "session_id": "session_abc",
  "input_summary": "Refund $75 on charge ch_abc"
}
```

**Response:**
```json
{
  "request_id": "clxyz123",
  "decision": "ALLOW",
  "trace": [
    { "code": "RULE_MATCH", "message": "Matched ALLOW rule rule_1", "metadata": { "rule_id": "rule_1", "effect": "ALLOW", "priority": 10 } },
    { "code": "BUDGET_CHECK", "message": "Evaluated budget limits", "metadata": { "org_spend_today_usd": 12.50, "org_limit_usd": 500 } },
    { "code": "RATE_LIMIT_CHECK", "message": "Evaluated rate limit", "metadata": { "limit": 60, "calls_in_current_window": 3 } },
    { "code": "ALLOW", "message": "Allowed by rule rule_1", "metadata": { "rule_id": "rule_1" } }
  ],
  "matched_rule_ids": ["rule_1"],
  "approval_request_id": null
}
```

#### `POST /v1/policies/simulate` — Test policies without side effects

Same request/response shape as `/v1/evaluate`, but does not create audit events or approval requests.

#### `GET /v1/policies` — List all policies for an org

**Query params:** `org_id` (required)

**Response:** Returns all rules, thresholds, budgets, and rate limits for the organization.

#### `POST /v1/policies/rules` — Create a policy rule

```json
{
  "org_id": "org_acme",
  "tool_name": "stripe",
  "tool_action": "refund",
  "effect": "ALLOW",
  "priority": 10,
  "reason": "Allow refunds under standard workflow",
  "agent_id": "agent_support_1"
}
```

Wildcard matching is supported: `tool_name: "*"` matches all tools, `tool_action: "*"` matches all actions.

#### `POST /v1/policies/thresholds` — Create an approval threshold

```json
{
  "org_id": "org_acme",
  "tool_name": "stripe",
  "tool_action": "refund",
  "amount_usd": 50.0
}
```

Tool calls with `cost_estimate_usd > amount_usd` will require manual approval.

#### `POST /v1/policies/budgets` — Create a budget limit

```json
{
  "org_id": "org_acme",
  "agent_id": "agent_support_1",
  "daily_limit_usd": 100.0
}
```

Omit `agent_id` for an org-wide budget. Agent-level budgets are evaluated independently.

#### `POST /v1/policies/rate-limits` — Create a rate limit

```json
{
  "org_id": "org_acme",
  "agent_id": "agent_support_1",
  "calls_per_minute": 30
}
```

### Audit

#### `POST /v1/audit/complete` — Record tool invocation outcome

```json
{
  "request_id": "clxyz123",
  "status": "SUCCESS",
  "latency_ms": 245,
  "output_summary": "Refund re_abc created"
}
```

#### `GET /v1/audit/events` — Query audit trail

**Query params:** `org_id`, `agent_id`, `tool_name`, `decision`, `limit`, `offset`

### Approvals

#### `GET /v1/approvals` — List approval requests

**Query params:** `org_id`, `status` (`PENDING` | `APPROVED` | `DENIED`)

#### `POST /v1/approvals/decision` — Approve or deny a request

```json
{
  "approval_request_id": "clxyz456",
  "decision": "APPROVED",
  "decided_by": "admin@acme.com"
}
```

### Telemetry

#### `POST /v1/ingest/events` — Ingest a run with events

```json
{
  "run": {
    "run_id": "run_demo_1",
    "org_id": "org_acme",
    "agent_id": "agent_support_1",
    "source": "OPENAI",
    "provider": "openai",
    "model": "gpt-4.1-mini",
    "task_name": "ticket_triage",
    "tags": ["support"]
  },
  "events": [
    {
      "event_id": "evt_1",
      "run_id": "run_demo_1",
      "org_id": "org_acme",
      "agent_id": "agent_support_1",
      "source": "OPENAI",
      "type": "RUN_STARTED",
      "status": "RUNNING"
    },
    {
      "event_id": "evt_2",
      "run_id": "run_demo_1",
      "org_id": "org_acme",
      "agent_id": "agent_support_1",
      "source": "OPENAI",
      "type": "MODEL_RESULT",
      "status": "SUCCESS",
      "input_tokens": 1200,
      "output_tokens": 180,
      "cost_usd": 0.012,
      "latency_ms": 860
    },
    {
      "event_id": "evt_3",
      "run_id": "run_demo_1",
      "org_id": "org_acme",
      "agent_id": "agent_support_1",
      "source": "OPENAI",
      "type": "RUN_COMPLETED",
      "status": "SUCCESS"
    }
  ],
  "finalize": { "status": "SUCCESS" }
}
```

**Response:**
```json
{
  "run_id": "run_demo_1",
  "accepted_events": 3,
  "deduped_events": 0,
  "run_status": "SUCCESS"
}
```

Events with duplicate `event_id` values are automatically deduplicated.

#### `GET /v1/runs` — List runs

**Query params:** `org_id`, `agent_id`, `status`, `source`, `limit`, `offset`

#### `GET /v1/runs/:runId` — Get run with events

Returns the full run record with all associated events, ordered by timestamp.

#### `POST /v1/runs/:runId/analyze` — Heuristic run analysis

```json
{
  "question": "What should I optimize first?"
}
```

Returns a rules-based analysis of the run (not LLM-backed in current version).

### Metrics

#### `GET /v1/metrics/overview` — Dashboard KPIs

**Query params:** `days` (default: 7)

Returns: total tool calls, blocked percentage, pending approvals, total cost, 7-day calls/cost trajectory, decision breakdown.

#### `GET /v1/metrics/tenants` — Organization-level metrics
#### `GET /v1/metrics/agents` — Agent list with metrics
#### `GET /v1/metrics/agents/:agentId` — Single agent detail metrics
#### `GET /v1/metrics/provider-breakdown` — Usage by provider

### Real-time

#### `GET /v1/events/stream` — Server-Sent Events stream

Streams live events for dashboard updates. Channels: `approvals`, `runs`, `events`.

## Console Features

| Page | Path | Description |
|------|------|-------------|
| **Overview** | `/overview` | KPI cards (tool calls, blocked %, pending approvals, cost), 7-day trajectory charts, decision distribution |
| **Run Explorer** | `/runs` | Filterable table of all runs with status badges, provider info, token/cost display |
| **Run Detail** | `/runs/:runId` | Event timeline, top cost events, heuristic analysis panel, run metadata and tags |
| **Live Timeline** | `/timeline` | Real-time SSE event stream with type filtering and tool call details |
| **Approvals** | `/approvals` | Pending approval requests with tool/agent/cost context, approve/deny actions |
| **Policy Studio** | `/policy-studio` | Create rules, thresholds, budgets, rate limits; simulate policy evaluations |
| **Tenants** | `/tenants/:orgId` | Org-level metrics (spend, agent count, rule count), agent list |
| **Agents** | `/agents/:agentId` | Agent KPIs, cost breakdown by tool, run count and status |

## Data Model

### Core Entities

```
Organization ─┬── Agent
              ├── PolicyRule          (ALLOW/DENY + priority + wildcard matching)
              ├── ApprovalThreshold   (cost-based approval triggers)
              ├── BudgetLimit         (daily spend caps, org or agent level)
              ├── RateLimitPolicy     (calls per minute)
              ├── AuditEvent          (governance decision records)
              ├── ApprovalRequest     (PENDING → APPROVED/DENIED)
              └── AgentRun ── AgentEvent (step-level telemetry)
```

### Run Status Lifecycle

| Status | Description |
|--------|-------------|
| `RUNNING` | Execution in progress |
| `SUCCESS` | Completed successfully |
| `ERROR` | Failed with error |
| `CANCELED` | Cancelled by user |

### Event Types

| Type | Description |
|------|-------------|
| `RUN_STARTED` | Run initialization |
| `MODEL_CALL` | LLM invocation (prompt sent) |
| `MODEL_RESULT` | LLM response (tokens, cost, latency) |
| `TOOL_CALL` | Tool invocation started |
| `TOOL_RESULT` | Tool returned result |
| `STEP` | Arbitrary step marker |
| `RUN_COMPLETED` | Successful completion |
| `RUN_FAILED` | Error completion |
| `APPROVAL_REQUESTED` | Manual approval required |

### Governance Decisions

| Decision | Description |
|----------|-------------|
| `ALLOW` | Policy permits execution |
| `DENY` | Policy blocks execution |
| `REQUIRE_APPROVAL` | Manual approval needed before execution |

## Development

### Make Commands

| Command | Description |
|---------|-------------|
| `make bootstrap` | Full initialization (install, infra, db, seed, test) |
| `make dev` | Start API (port 4000) + Console (port 3000) in watch mode |
| `make install` | `pnpm install --frozen-lockfile` |
| `make infra` | Start Postgres + Redis containers |
| `make db-create` | Create the `governor` database |
| `make prisma-generate` | Generate Prisma client |
| `make prisma-migrate` | Run database migrations |
| `make seed` | Populate demo seed data |
| `make test` | Build and run all tests |
| `make down` | Stop Docker containers |
| `make logs` | Follow Docker container logs |

### Root Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Alias for `make dev` |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run all test suites |
| `pnpm lint` | Run linters across workspace |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Run seed script |

### Testing

```bash
# Policy engine unit tests
pnpm --filter @governor/policy-engine test

# API integration tests
pnpm --filter @governor/api test

# Full workspace (build + test)
pnpm build && pnpm test
```

### Docker Compose Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | `postgres:16-alpine` | 5432 | Primary database |
| `redis` | `redis:7-alpine` | 6379 | Rate limits, SSE pub/sub, spend cache |
| `api` | Custom Dockerfile | 4000 | Fastify API service |
| `console` | Custom Dockerfile | 3000 | Next.js frontend |

## Verifying Your Setup

### 1. Health check and metrics

```bash
curl http://localhost:4000/health
curl "http://localhost:4000/v1/metrics/overview?days=7"
```

### 2. Explore runs

```bash
curl "http://localhost:4000/v1/runs?limit=5"
curl "http://localhost:4000/v1/runs/run_36"
curl -X POST "http://localhost:4000/v1/runs/run_36/analyze" \
  -H "content-type: application/json" \
  -d '{"question":"What should I optimize first?"}'
```

### 3. Ingest a live run

```bash
curl -X POST "http://localhost:4000/v1/ingest/events" \
  -H "content-type: application/json" \
  -d '{
    "run": {
      "run_id": "run_live_demo_1",
      "org_id": "org_demo_1",
      "agent_id": "agent_support_1",
      "source": "OPENAI",
      "provider": "openai",
      "model": "gpt-4.1-mini",
      "task_name": "live_demo"
    },
    "events": [
      { "event_id": "evt_live_1", "run_id": "run_live_demo_1", "org_id": "org_demo_1", "agent_id": "agent_support_1", "source": "OPENAI", "type": "RUN_STARTED", "status": "RUNNING" },
      { "event_id": "evt_live_2", "run_id": "run_live_demo_1", "org_id": "org_demo_1", "agent_id": "agent_support_1", "source": "OPENAI", "type": "MODEL_RESULT", "status": "SUCCESS", "input_tokens": 1200, "output_tokens": 180, "cost_usd": 0.012, "latency_ms": 860 },
      { "event_id": "evt_live_3", "run_id": "run_live_demo_1", "org_id": "org_demo_1", "agent_id": "agent_support_1", "source": "OPENAI", "type": "RUN_COMPLETED", "status": "SUCCESS" }
    ],
    "finalize": { "status": "SUCCESS" }
  }'
```

Then visit http://localhost:3000/runs to inspect `run_live_demo_1`.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `REDIS_URL` missing or env parse errors | Ensure `.env` exists (`make ensure-env`) and start dev with `make dev` so defaults are injected |
| Clerk key errors in local dev | Placeholder keys run local-mode UI. Use real Clerk keys in `.env` to enable full auth |
| `EADDRINUSE` on port 3000/4000 | Stop previous processes on those ports, then rerun `make dev` |
| Next.js stale cache issues | Stop dev server, remove `apps/console/.next`, restart `make dev` |
| Prisma client not generated | Run `make prisma-generate` or `pnpm db:generate` |
| Database connection refused | Ensure Docker is running and `make infra` has completed |

## Current Limitations

- `POST /v1/runs/:runId/analyze` uses heuristic/rules-based analysis, not yet LLM-backed.
- No materialized views for time-series rollups (uses direct query aggregation).
- No webhooks or outbound connectors (Slack/PagerDuty/Jira).
- Approval workflow is API-driven; enterprise escalations and SLA policies are not fully modeled.
- Auth runs in local mode when Clerk keys are placeholders.

## Roadmap

### Phase 2: Product Depth
- Replace heuristic run analyzer with model-backed analyst copilot (RAG over run/event/policy data).
- Add provider-native middleware examples for OpenAI, Anthropic, Gemini, LangChain callbacks.
- Add policy versioning with draft/publish, rollback, and diff viewer.
- Add incident surfacing and anomaly detection on spend/error-rate/latency drifts.

### Phase 3: Enterprise Controls
- SSO/SCIM + stronger Clerk org role mapping.
- Signed decision attestations and tamper-evident audit chain.
- Data retention controls, PII tagging/redaction pipeline.
- Multi-region deployment blueprint.

### Phase 4: Platform Integrations
- Slack/PagerDuty/Jira connectors for approvals and incidents.
- Data warehouse export (Snowflake/BigQuery) for FinOps and compliance.
- Webhook subscriptions for `run.updated`, `event.ingested`, `approval.*` events.
- Team-based saved views and alert subscriptions.
