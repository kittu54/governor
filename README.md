# Governor

Governor is an AI Governance Control Tower for tool-using AI agents. It sits between your AI agents and the tools they invoke, enforcing policy decisions in real time while capturing full telemetry for observability and compliance.

It works with agents built on **any framework** — LangChain, CrewAI, AutoGen, n8n, Zapier, MindStudio, Vertex AI, Copilot Studio, or custom SDKs — and provides a unified governance, approval, and audit layer.

## What Governor Does

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
│  │                     │   │                                  │   │
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

**Core capabilities:**

- **Governance Gateway SDK** — wraps tool calls and enforces policy decisions before execution, with retry logic and configurable fallback.
- **Policy Engine** — evaluates rules using a conditions DSL, semantic risk classification, enforcement modes (DEV/STAGING/PROD), budget checks, rate limits, and approval requirements.
- **Policy Versioning** — create, version, compile, publish, and roll back policy sets with full diff and audit trail.
- **Risk Classification** — semantic taxonomy (MONEY_MOVEMENT, CODE_EXECUTION, PII_ACCESS, etc.) with auto-classification heuristics and admin overrides.
- **Tool Registry** — centralized catalog of tools with risk class assignments, sensitivity flags, and auto-classify.
- **Approval Workflows** — operator-centric inbox with approve/deny/escalate/comment, evidence capture, expiry, and SLA tracking.
- **Full Audit Trail** — immutable entity-level audit log alongside governance decision records and evaluation traces.
- **MCP Governance** — register MCP servers, auto-discover tools, classify risk, and enforce policies across MCP tool calls.
- **Policy Simulation** — simulate policy changes against single evaluations or historical runs to preview impact before deploying.
- **Advanced Approval Workflows** — multi-level approval chains with per-level timeouts, auto-escalation, auto-deny on expiry, and bulk actions.
- **Operator Analytics** — governance metrics: blocked actions, approval rates, spend prevented, top risky tools, risk distribution, and daily trends.
- **Audit Integrity** — optional hash chaining for audit events with cryptographic verification endpoint.
- **Webhooks** — event-driven notifications for external integrations.
- **Telemetry Ingestion** — captures run-level and event-level data from any AI provider.
- **Visual Console** — dashboards for operations, approvals, policy authoring, tool registry, MCP servers, and analytics.

## How Policy Evaluation Works

When an agent invokes a tool through the Governor SDK, the policy engine evaluates the call through a priority-ordered pipeline:

```
Tool call arrives
       │
       ▼
┌──────────────────┐
│ Risk Classify    │ Determine risk class (registry → heuristics → default)
└──────┬───────────┘
       ▼
┌──────────────────┐     Sensitive action in PROD with no explicit ALLOW?
│ Environment +    │────── YES ──▶ DENY (safe-by-default in PROD)
│ Sensitivity Check│
└──────┬───────────┘
       │ NO
       ▼
┌──────────────────┐     Budget exceeded?
│ Budget Check     │────── YES ──▶ DENY (org or agent daily limit exceeded)
└──────┬───────────┘
       │ NO
       ▼
┌──────────────────┐     Calls ≥ limit?
│ Rate Limit       │────── YES ──▶ DENY (rate limit exceeded)
└──────┬───────────┘
       │ NO
       ▼
┌──────────────────┐     Matching DENY rule (with conditions)?
│ Explicit DENY    │────── YES ──▶ DENY (blocked by rule)
│ Rules            │
└──────┬───────────┘
       │ NO
       ▼
┌──────────────────┐     Approval required by risk class or threshold?
│ Approval Check   │────── YES ──▶ REQUIRE_APPROVAL
│                  │
└──────┬───────────┘
       │ NO
       ▼
┌──────────────────┐     Matching ALLOW rule?
│ Allow Rules      │────── YES ──▶ ALLOW (explicit rule)
└──────┬───────────┘
       │ NO
       ▼
   DEFAULT (mode-dependent: ALLOW in DEV/STAGING, DENY sensitive in PROD)
```

Every evaluation returns a **decision trace** — an array of `DecisionTraceItem` objects showing each step the engine considered, and the `explain()` utility converts traces to human-readable text.

## Risk Classes

Governor uses a semantic risk taxonomy to classify tool actions:

| Risk Class | Severity | Examples |
|------------|----------|----------|
| `MONEY_MOVEMENT` | Critical (95) | `stripe.refund`, `paypal.transfer` |
| `CODE_EXECUTION` | Critical (90) | `shell.exec`, `docker.run` |
| `ADMIN_ACTION` | Critical (90) | `iam.grant`, `k8s.deploy` |
| `CREDENTIAL_USE` | Critical (85) | `vault.read`, `aws.assume_role` |
| `EXTERNAL_COMMUNICATION` | High (80) | `gmail.send`, `twilio.sms` |
| `DATA_EXPORT` | High (75) | `s3.export`, `bigquery.export` |
| `PII_ACCESS` | High (85) | `customer.lookup`, `user.get_pii` |
| `DATA_WRITE` | Medium (60) | `postgres.update`, `mongo.insert` |
| `FILE_MUTATION` | Medium (75) | `fs.delete`, `s3.delete` |
| `LOW_RISK` | Low (10) | `http.GET`, `cache.read` |

Tools are classified by: (1) registered overrides in the tool registry, (2) default keyword-based heuristics, or (3) fallback to `LOW_RISK`.

## Monorepo Structure

```
governor/
├── apps/
│   ├── api/              Fastify API service — governance, audit, tools, metrics, webhooks, MCP, simulation
│   │   ├── src/modules/  Feature modules (policy, tools, approvals, audit, metrics, mcp, simulation, etc.)
│   │   ├── prisma/       Database schema, migrations, and seed data
│   │   └── test/         Integration tests
│   │
│   └── console/          Next.js 15 visual control tower
│       ├── src/app/      App Router pages (overview, runs, approvals, policy-studio, tools, mcp, audit, etc.)
│       └── src/components/ UI components (layout, charts, policy, tools, mcp, approvals, audit)
│
├── packages/
│   ├── sdk/              Integration SDK — wrapTool, telemetry, provider adapters, error classes
│   ├── policy-engine/    Pure TypeScript policy evaluation, conditions DSL, compile, explain, diff
│   └── shared/           Shared types, Zod schemas, risk taxonomy, and contracts
│
├── examples/
│   ├── openai-agent/     OpenAI function-calling tools with Governor governance
│   ├── langchain-agent/  LangChain tools with wrapLangChainTool
│   ├── mcp-server/       MCP server dispatch with evaluate()
│   └── internal-tool/    Internal pipeline with telemetry runs
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
| Agents | 5 | Support, Finance, Ops, Data, Dev agents |
| Tools | 14 | Across all risk classes (stripe, gmail, shell, vault, etc.) |
| Policy Packs | 3 | Customer Support, Finance Ops, Development Sandbox |
| Approval Policies | 3 | Money Movement, Data Export, Admin Action |
| Audit events | 2,000 | Governance decision records |
| Audit log entries | 8 | Entity-level audit trail |
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
| `GOVERNOR_ENVIRONMENT` | No | — | Enforcement mode (DEV, STAGING, PROD) |
| `GOVERNOR_ON_ERROR` | No | `throw` | Behavior if Governor is unreachable (throw, allow, deny) |

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
  api_key: "your-api-key",
  environment: "PROD",
  on_error: "deny",
  max_retries: 3,
  timeout_ms: 5000,
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
//   1. Classify risk (MONEY_MOVEMENT for stripe.refund)
//   2. Check enforcement mode (DEV=audit, STAGING=warn, PROD=enforce)
//   3. Evaluate policies (budgets, rate limits, rules with conditions, approvals)
//   4. If ALLOW → execute handler → record SUCCESS in audit
//   5. If DENY → throw GovernorDeniedError (handler never executes)
//   6. If REQUIRE_APPROVAL → throw GovernorApprovalRequiredError
await refund({ amount_usd: 75, charge_id: "ch_abc123" });
```

### Handling Governance Decisions

```ts
import { GovernorDeniedError, GovernorApprovalRequiredError } from "@governor/sdk";

try {
  await refund({ amount_usd: 500, charge_id: "ch_xyz" });
} catch (error) {
  if (error instanceof GovernorDeniedError) {
    console.log("Denied:", error.reason);
    console.log("Risk class:", error.risk_class);
    console.log("Enforcement mode:", error.enforcement_mode);
    console.log("Trace:", error.trace);
  } else if (error instanceof GovernorApprovalRequiredError) {
    console.log("Approval needed:", error.approval_request_id);
    console.log("Risk class:", error.risk_class);
  } else {
    throw error;
  }
}
```

### Convenience Wrappers

```ts
// Governed fetch
const governedFetch = gov.wrapFetch();

// Governed OpenAI function call
const searchTool = gov.wrapOpenAITool("web_search", async (args: { query: string }) => {
  return await searchEngine.search(args.query);
});

// Governed LangChain tool
const calcTool = gov.wrapLangChainTool("calculator", async (args: { expression: string }) => {
  return evaluate(args.expression);
});
```

### Telemetry — Run Lifecycle Tracking

```ts
const run = gov.adapters.openai("run_ticket_001", {
  model: "gpt-4.1-mini",
  task_name: "ticket_triage",
  tags: ["support", "tier-1"],
});

await run.start();
await run.modelCall({ prompt: "Classify this support ticket: ..." });
await run.modelResult({ input_tokens: 900, output_tokens: 140, cost_usd: 0.01, latency_ms: 740 });
await run.toolCall({ tool_name: "zendesk", tool_action: "update_ticket" });
await run.toolResult({ tool_name: "zendesk", tool_action: "update_ticket", status: "SUCCESS", latency_ms: 120 });
await run.complete();
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
  "cost_estimate_usd": 75,
  "environment": "PROD",
  "metadata": { "customer_tier": "enterprise" }
}
```

**Response:**
```json
{
  "request_id": "clxyz123",
  "decision": "DENY",
  "reason": "Matched DENY rule: block-high-refunds",
  "risk_class": "MONEY_MOVEMENT",
  "enforcement_mode": "PROD",
  "trace": [
    { "code": "MODE_CHECK", "message": "Enforcement mode: PROD" },
    { "code": "SENSITIVE_CHECK", "message": "Action marked sensitive (risk class: MONEY_MOVEMENT, severity: high)" },
    { "code": "RULE_MATCH", "message": "Matched DENY rule: block-high-refunds" }
  ],
  "matched_rule_ids": [],
  "approval_request_id": null,
  "warnings": []
}
```

#### `POST /v1/evaluate/simulate` — Dry-run evaluation (no side effects)

Same request/response shape as `/v1/evaluate`, but does not create audit events, evaluations, or approval requests.

#### `POST /v1/evaluate/explain` — Human-readable evaluation explanation

Returns a line-by-line textual explanation of the evaluation decision.

### Versioned Policies (v2)

#### `GET /v1/policies/v2` — List versioned policies
#### `POST /v1/policies/v2` — Create a new policy

```json
{
  "org_id": "org_acme",
  "name": "Finance Controls",
  "description": "Strict rules for payment processing",
  "enforcement_mode": "PROD"
}
```

#### `POST /v1/policies/v2/:id/versions` — Create a policy version

```json
{
  "definition": {
    "rules": [
      {
        "name": "block-high-value",
        "effect": "DENY",
        "priority": 10,
        "subjects": [{ "type": "tool", "value": "stripe.refund" }],
        "conditions": [{ "field": "cost_estimate_usd", "operator": "greater_than", "value": 500 }],
        "reason": "Refunds over $500 require manual processing"
      }
    ]
  },
  "change_summary": "Added $500 refund limit"
}
```

The definition is compiled and validated, generating a deterministic checksum.

#### `POST /v1/policies/v2/versions/:versionId/publish` — Publish a version
#### `POST /v1/policies/v2/versions/:versionId/rollback-target` — Rollback to a version
#### `GET /v1/policies/v2/versions/:versionId/diff/:otherVersionId` — Compare versions

### Tool Registry

#### `GET /v1/tools` — List registered tools
#### `POST /v1/tools` — Register or upsert a tool

```json
{
  "org_id": "org_acme",
  "tool_name": "stripe",
  "tool_action": "refund",
  "risk_class": "MONEY_MOVEMENT",
  "is_sensitive": true,
  "display_name": "Stripe Refund",
  "description": "Process customer refunds via Stripe API"
}
```

#### `POST /v1/tools/classify-risk` — Auto-classify a tool's risk

```json
{ "tool_name": "stripe", "tool_action": "refund" }
```

Returns: `{ "risk_class": "MONEY_MOVEMENT", "source": "default_mapping", "confidence": 0.95 }`

#### `GET /v1/tools/risk-classes` — List all risk classes with metadata

### Policy Simulation

#### `POST /v1/simulation/simulate` — Simulate a policy version against a single evaluation

```json
{
  "policy_version_id": "pv_abc",
  "tool_name": "stripe",
  "tool_action": "refund",
  "agent_id": "agent_support_1",
  "risk_class": "MONEY_MOVEMENT",
  "cost_estimate_usd": 200,
  "environment": "PROD"
}
```

Returns: current decision, simulated decision, and diff.

#### `POST /v1/simulation/simulate-historical` — Simulate against historical evaluations

```json
{
  "policy_version_id": "pv_abc",
  "lookback_hours": 168,
  "org_id": "org_acme"
}
```

Returns: total events, changed decisions, affected agents/tools, sample impacted runs.

### Policy Validation

#### `POST /v1/policies/v2/validate` — Validate a policy definition

Checks for rule conflicts, missing conditions, invalid risk-class references, and duplicate priorities.

### MCP Server Registry

#### `POST /v1/mcp/servers` — Register an MCP server
#### `GET /v1/mcp/servers` — List MCP servers
#### `GET /v1/mcp/servers/:id` — Get MCP server details
#### `PATCH /v1/mcp/servers/:id` — Update an MCP server
#### `DELETE /v1/mcp/servers/:id` — Remove an MCP server
#### `GET /v1/mcp/servers/:id/tools` — List tools for an MCP server
#### `POST /v1/mcp/servers/:id/sync` — Discover and classify tools from an MCP server

### Batch Risk Classification

#### `POST /v1/tools/classify-risk/batch` — Classify risk for multiple tools

```json
{
  "tools": [
    { "tool_name": "stripe", "tool_action": "refund" },
    { "tool_name": "gmail", "tool_action": "send" }
  ]
}
```

### Legacy Policies (v1)

#### `GET /v1/policies` — List rules, thresholds, budgets, rate limits
#### `POST /v1/policies/rules` — Create a policy rule
#### `POST /v1/policies/thresholds` — Create an approval threshold
#### `POST /v1/policies/budgets` — Create a budget limit
#### `POST /v1/policies/rate-limits` — Create a rate limit

### Approvals

#### `GET /v1/approvals` — List approval requests (with agent names, risk class, evidence, actions)
#### `POST /v1/approvals/:id/approve` — Approve with optional comment
#### `POST /v1/approvals/:id/deny` — Deny with optional comment
#### `POST /v1/approvals/:id/escalate` — Escalate to next approval level
#### `POST /v1/approvals/:id/comment` — Add a comment
#### `POST /v1/approvals/bulk` — Bulk approve or deny (up to 100 requests)

### Audit

#### `GET /v1/audit-log` — Query entity-level audit trail

**Query params:** `org_id`, `event_type`, `entity_type`, `entity_id`, `from`, `to`, `search`, `limit`, `offset`

#### `GET /v1/audit/events` — Query governance decision audit trail
#### `GET /v1/audit-log/verify?org_id=xxx` — Verify audit chain integrity

Returns: `{ valid: true, total_entries: 150, verified_entries: 150 }` or details of the first broken link.

### Webhooks

#### `GET /v1/webhooks` — List webhooks
#### `POST /v1/webhooks` — Create a webhook
#### `PATCH /v1/webhooks/:id` — Update a webhook
#### `POST /v1/webhooks/:id/test` — Send a test delivery

### Metrics

#### `GET /v1/metrics/overview` — Dashboard KPIs
#### `GET /v1/metrics/risk-classes` — Evaluations by risk class
#### `GET /v1/metrics/costs` — Cost breakdown (governed, blocked, run costs)
#### `GET /v1/metrics/approvals` — Approval statistics
#### `GET /v1/metrics/tenants` — Organization-level metrics
#### `GET /v1/metrics/agents` — Agent list with metrics
#### `GET /v1/metrics/provider-breakdown` — Usage by provider
#### `GET /v1/metrics/governance` — Governance analytics (blocked actions, spend prevented, daily trends)
#### `GET /v1/metrics/tools` — Per-tool metrics (evaluations, denials, cost, block rate)

### Telemetry

#### `POST /v1/ingest/events` — Ingest a run with events
#### `GET /v1/runs` — List runs
#### `GET /v1/runs/:runId` — Get run with events

### Real-time

#### `GET /v1/events/stream` — Server-Sent Events stream

## Console Features

| Page | Path | Description |
|------|------|-------------|
| **Overview** | `/overview` | KPI cards, risk class distribution, cost metrics, 7-day trajectory, decision breakdown |
| **Live Timeline** | `/timeline` | Real-time SSE event stream with type filtering |
| **Approvals** | `/approvals` | Inbox with risk badges, agent names, approve/deny/escalate/comment, evidence, SLA countdown |
| **Policy Studio** | `/policy-studio` | Versioned policy management (create/publish/rollback/diff), legacy rules/thresholds/budgets/rate limits, simulator |
| **Run Explorer** | `/runs` | Filterable table of all runs with status, provider, cost display |
| **Run Detail** | `/runs/:runId` | Event timeline, cost events, analysis panel |
| **Tool Registry** | `/tools` | Register tools, auto-classify risk, batch classify, risk class reference |
| **MCP Servers** | `/mcp` | MCP server registry, tool discovery, auto-classification, sync |
| **Audit Explorer** | `/audit` | Entity-level audit log with search, type filtering, expandable payloads |
| **Agents** | `/agents` | Register agents with framework/environment/provider, view stats |
| **Agent Detail** | `/agents/:agentId` | Agent KPIs, linked policies, allowed tools, recent runs |
| **Tenants** | `/tenants` | Org-level metrics |
| **Integrations** | `/integrations` | API keys and framework detection |
| **Governance Dashboard** | via `/overview` | Blocked actions, approval rates, spend prevented, risk distribution |

## Data Model

### Core Entities

```
Organization ─┬── Agent (framework, environment, provider)
              ├── Tool (risk class, sensitivity)
              ├── Policy ── PolicyVersion (definition, checksum, published)
              ├── PolicyRule (ALLOW/DENY + priority + conditions + risk class)
              ├── ApprovalThreshold (cost-based triggers)
              ├── ApprovalPolicy (risk-class triggers, auto-expiry)
              ├── BudgetLimit / Budget v2 (daily/weekly/monthly spend caps)
              ├── RateLimitPolicy / RateLimit v2 (calls per window)
              ├── AuditEvent (governance decision records)
              ├── AuditLog (entity-level audit trail)
              ├── Evaluation (enriched governance evaluation records)
              ├── ApprovalRequest ── ApprovalAction (approve/deny/escalate/comment)
              ├── Webhook (event-driven notifications)
              └── AgentRun ── AgentEvent (step-level telemetry)
```

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

### Enforcement Modes

| Mode | Sensitive Actions | Non-Sensitive | `would_deny_in_prod` |
|------|-------------------|---------------|----------------------|
| `DEV` | Allow + warn | Allow | `true` for sensitive |
| `STAGING` | Allow + warn | Allow | `true` for sensitive |
| `PROD` | Deny (unless explicit ALLOW rule) | Default allow | N/A |

Sensitive risk classes: `MONEY_MOVEMENT`, `DATA_EXPORT`, `CODE_EXECUTION`, `FILE_MUTATION`, `ADMIN_ACTION`, `CREDENTIAL_USE`, `PII_ACCESS`, `EXTERNAL_COMMUNICATION`.

### Examples

Working integration examples in `examples/`:

```bash
# Run any example (requires Governor API running locally)
npx tsx examples/openai-agent/index.ts     # OpenAI function-calling
npx tsx examples/langchain-agent/index.ts  # LangChain tools
npx tsx examples/mcp-server/index.ts       # MCP server governance
npx tsx examples/internal-tool/index.ts    # Internal pipeline + telemetry
```

See [examples/README.md](./examples/README.md) for full documentation.

### Testing

```bash
# Policy engine unit tests (131 tests)
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

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `REDIS_URL` missing or env parse errors | Ensure `.env` exists (`make ensure-env`) and start dev with `make dev` |
| Clerk key errors in local dev | Placeholder keys run local-mode UI. Use real Clerk keys for full auth |
| `EADDRINUSE` on port 3000/4000 | Stop previous processes, then rerun `make dev` |
| Next.js stale cache issues | Stop dev server, remove `apps/console/.next`, restart |
| Prisma client not generated | Run `make prisma-generate` or `pnpm db:generate` |
| Database connection refused | Ensure Docker is running and `make infra` has completed |

## Roadmap

### Completed
- Enforcement consistency (DEV/STAGING/PROD with sensitive action handling).
- Policy simulation engine (single + historical blast radius).
- Policy version lifecycle (validation, conflict detection, structured diff).
- MCP server governance (registry, tool discovery, auto-classification).
- Advanced approval workflows (chains, escalation, bulk actions).
- Batch risk classification.
- Operator analytics (governance metrics, per-tool analytics).
- Audit hash chaining + integrity verification.
- Integration examples (OpenAI, LangChain, MCP, internal tools).

### Next: Enterprise Depth
- Policy pack marketplace (installable rule + risk mapping bundles).
- Model-backed analyst copilot (RAG over run/event/policy data).
- SSO/SCIM + stronger Clerk org role mapping.
- Data retention controls, PII tagging/redaction pipeline.
- Multi-region deployment blueprint.

### Future: Platform Integrations
- Slack/PagerDuty/Jira connectors for approvals and incidents.
- Data warehouse export (Snowflake/BigQuery) for FinOps and compliance.
- Team-based saved views and alert subscriptions.
- Provider-native middleware for OpenAI, Anthropic, Gemini, LangChain callbacks.
