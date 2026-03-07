# Governor

Governor is a visual-first AI Governance Control Tower for tool-using AI agents.

It provides:
- A governance gateway SDK that wraps tool calls and enforces policy decisions.
- A policy engine with traceable `ALLOW`, `DENY`, and `REQUIRE_APPROVAL` decisions.
- Full audit/event storage for runs, tool calls, model calls, and outcomes.
- A visual console for operations, approvals, policy authoring, and run-level analytics.

## Current Implementation Status

This repository is now beyond static mockup. It includes working ingest, policy evaluation, audit storage, seeded telemetry, and a live visual control tower.

### Implemented End-to-End
- Multi-tenant entities (organizations, agents, sessions, users).
- Policy evaluation service:
  - Rule matching with wildcard support.
  - Approval thresholds (for example `stripe.refund > $50`).
  - Budget checks (org/agent daily limits).
  - Rate-limit checks.
  - Decision traces returned to callers.
- Audit logging for tool invocation lifecycle.
- Telemetry ingestion for run/event streams:
  - Run-level records (`agent_runs`).
  - Event-level records (`agent_events`) with per-step metadata.
  - Event deduplication by external event id.
- Real-time stream endpoint (`/v1/events/stream`) for console updates.
- Console dashboards and explorers:
  - Overview dashboard.
  - Live timeline.
  - Approvals inbox.
  - Policy studio + simulator.
  - Tenant explorer.
  - Agent explorer.
  - Run explorer and run detail with event timeline and analysis chat.
- SDK integration helpers:
  - `wrapTool` governance gateway.
  - `wrapFetch`, `wrapOpenAITool`, `wrapLangChainTool`.
  - Run telemetry lifecycle helpers (`start`, `modelCall`, `toolCall`, `complete`, `fail`, etc.).
  - Provider adapters for OpenAI / Anthropic / Gemini / LangChain event emission.
- Seed dataset for realistic demos.

## Monorepo Structure

```txt
/apps/api
/apps/console
/packages/sdk
/packages/policy-engine
/packages/shared
```

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- Tailwind CSS
- shadcn/ui-style component patterns
- Recharts
- Clerk integration with local-mode fallback

### Backend
- Node.js + TypeScript
- Fastify
- PostgreSQL
- Prisma ORM
- Redis

### Infra / DevX
- Docker Compose for Postgres + Redis
- Makefile for bootstrap/dev lifecycle
- Env-driven configuration
- Workspace package boundaries prepared for future service extraction

## Architecture Overview

### apps/api
Fastify API service handling:
- Policy evaluation (`/v1/evaluate`)
- Policy management (rules/thresholds/budgets/rate-limits/simulate)
- Audit completion + retrieval
- Approvals workflows
- Metrics aggregation endpoints
- Telemetry ingestion (`/v1/ingest/events`)
- Run explorer API (`/v1/runs`, `/v1/runs/:runId`, `/v1/runs/:runId/analyze`)
- SSE event stream (`/v1/events/stream`)

### apps/console
Visual governance control tower:
- Dashboard KPIs and charts
- Live timeline feed
- Approval actions
- Policy editing/simulation
- Tenant + agent analytics
- Run explorer with:
  - easy/pro/hardcore views
  - event timeline
  - per-run analysis panel and Q/A endpoint integration

### packages/sdk
Integration SDK for agent/tool applications:
- Governance wrapper around tools (`wrapTool`)
- Convenience wrappers for common integrations
- Telemetry run/event emission API
- Provider adapter presets:
  - `adapters.openai`
  - `adapters.claude`
  - `adapters.gemini`
  - `adapters.langchain`

### packages/policy-engine
Pure TypeScript evaluation logic with unit tests.

### packages/shared
Shared types, schemas, and validation contracts used across API/SDK/console.

## Data Model Highlights

Core runtime/governance entities include:
- `Organization`
- `Agent`
- `PolicyRule`
- `ApprovalThreshold`
- `BudgetLimit`
- `RateLimitPolicy`
- `AuditEvent`
- `ApprovalRequest`
- `AgentRun`
- `AgentEvent`

Telemetry supports:
- Run status lifecycle (`RUNNING`, `SUCCESS`, `ERROR`, `CANCELED`)
- Event types (`RUN_STARTED`, `MODEL_CALL`, `MODEL_RESULT`, `TOOL_CALL`, `TOOL_RESULT`, `RUN_COMPLETED`, `RUN_FAILED`, `APPROVAL_REQUESTED`, etc.)
- Cost, latency, token, and payload metadata
- Arbitrary structured metadata/tags for future analytics dimensions

## API Endpoints

### Governance / Policy
- `POST /v1/evaluate`
- `GET /v1/policies`
- `POST /v1/policies/rules`
- `POST /v1/policies/thresholds`
- `POST /v1/policies/budgets`
- `POST /v1/policies/rate-limits`
- `POST /v1/policies/simulate`

### Audit / Approvals
- `GET /v1/audit/events`
- `POST /v1/audit/complete`
- `GET /v1/approvals`
- `POST /v1/approvals/decision`

### Metrics / Realtime
- `GET /v1/metrics/overview`
- `GET /v1/metrics/tenants`
- `GET /v1/metrics/agents`
- `GET /v1/metrics/agents/:agentId`
- `GET /v1/metrics/provider-breakdown`
- `GET /v1/events/stream`

### Run Telemetry
- `POST /v1/ingest/events`
- `GET /v1/runs`
- `GET /v1/runs/:runId`
- `POST /v1/runs/:runId/analyze`

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
- API: [http://localhost:4000](http://localhost:4000)
- Console: [http://localhost:3000](http://localhost:3000)

### What `make bootstrap` does
1. Ensures `.env` exists.
2. Installs workspace dependencies (non-interactive lockfile install).
3. Starts Postgres + Redis containers.
4. Waits for Postgres readiness and ensures `governor` database exists.
5. Runs Prisma generate + migrate + seed.
6. Runs policy-engine and API tests.

## Root Commands

- `pnpm dev` -> `make dev`
- `pnpm build` -> build all packages/apps
- `pnpm test` -> run all tests
- `pnpm lint` -> run package lint commands
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:seed`

## Test In Action

### 1) Validate seed + metrics
```bash
curl "http://localhost:4000/health"
curl "http://localhost:4000/v1/metrics/overview?days=7"
```

### 2) Explore runs and analysis
```bash
curl "http://localhost:4000/v1/runs?limit=5"
curl "http://localhost:4000/v1/runs/run_36"
curl -X POST "http://localhost:4000/v1/runs/run_36/analyze" \
  -H "content-type: application/json" \
  -d '{"question":"What should I optimize first?"}'
```

### 3) Ingest a live run/event batch
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
      { "event_id": "evt_live_1", "run_id": "run_live_demo_1", "org_id": "org_demo_1", "agent_id": "agent_support_1", "source": "OPENAI", "provider": "openai", "model": "gpt-4.1-mini", "type": "RUN_STARTED", "status": "RUNNING" },
      { "event_id": "evt_live_2", "run_id": "run_live_demo_1", "org_id": "org_demo_1", "agent_id": "agent_support_1", "source": "OPENAI", "provider": "openai", "model": "gpt-4.1-mini", "type": "MODEL_RESULT", "status": "SUCCESS", "input_tokens": 1200, "output_tokens": 180, "cost_usd": 0.012, "latency_ms": 860 },
      { "event_id": "evt_live_3", "run_id": "run_live_demo_1", "org_id": "org_demo_1", "agent_id": "agent_support_1", "source": "OPENAI", "provider": "openai", "model": "gpt-4.1-mini", "type": "RUN_COMPLETED", "status": "SUCCESS" }
    ],
    "finalize": { "status": "SUCCESS" }
  }'
```

Open [http://localhost:3000/runs](http://localhost:3000/runs) and inspect `run_live_demo_1`.

## SDK Usage Examples

### Governance gateway wrapper
```ts
import { createGovernorFromEnv } from "@governor/sdk";

const gov = createGovernorFromEnv();

const refund = gov.wrapTool({
  tool_name: "stripe",
  tool_action: "refund",
  handler: async (payload: { amount_usd: number }) => ({ ok: true, ...payload }),
  costEstimator: (payload) => payload.amount_usd * 0.0002
});

await refund({ amount_usd: 75 });
```

### Telemetry run lifecycle
```ts
import { createGovernorFromEnv } from "@governor/sdk";

const gov = createGovernorFromEnv();
const run = gov.adapters.openai("run_live_sdk_1", {
  model: "gpt-4.1-mini",
  task_name: "ticket_triage"
});

await run.start();
await run.modelCall({ prompt: "Classify this support ticket" });
await run.modelResult({ input_tokens: 900, output_tokens: 140, cost_usd: 0.01, latency_ms: 740 });
await run.complete({ final: "resolved" });
```

## Demo Seed Contents

Seeding currently generates:
- 3 organizations
- 5 agents
- 2000 audit events
- 20 pending approvals
- 450 runs across OpenAI / Anthropic / Gemini / LangChain sources
- Thousands of run events with token/cost/latency/tool metadata

## Current Limitations

- `POST /v1/runs/:runId/analyze` is heuristic/rules-based analysis, not yet LLM-backed.
- No long-term time-series rollups/materialized views yet (direct query aggregation).
- No webhooks/outbound connectors yet (Slack/PagerDuty/Jira).
- Approval workflow is API-driven; enterprise escalations/SLA policy not fully modeled.
- Auth in local dev can run in local mode when Clerk keys are placeholders.

## What To Do Next (Recommended Roadmap)

### Phase 2: Product Depth
1. Replace heuristic run analyzer with model-backed analyst copilot (RAG over run/event/policy data).
2. Add provider-native middleware examples for OpenAI, Anthropic, Gemini, LangChain callbacks.
3. Add policy versioning + draft/publish + rollback + diff viewer.
4. Add incident surfacing and anomaly detection on spend/error-rate/latency drifts.

### Phase 3: Enterprise Controls
1. SSO/SCIM + stronger Clerk org role mapping.
2. Signed decision attestations and tamper-evident audit chain.
3. Data retention controls, PII tagging/redaction pipeline, encryption posture upgrades.
4. Multi-region deployment blueprint and migration path to microservices.

### Phase 4: Platform Integrations
1. Slack/PagerDuty/Jira connectors for approvals/incidents.
2. Data warehouse export (Snowflake/BigQuery) for FinOps and compliance reporting.
3. Webhook subscriptions for `run.updated`, `event.ingested`, `approval.*` events.
4. Team-based saved views and alert subscriptions in console.

## Brainstorm Ideas (Product + UX)

### Governance Intelligence
- "Why blocked?" copilot that explains exact policy path and suggests safe policy edits.
- Cost leak detector: identify repeated expensive tool/model loops by agent/task.
- Prompt drift monitor: detect sudden token/context expansion and attach root-cause hypotheses.
- Approval policy recommender based on historical risk and user override patterns.

### Developer Experience
- Drop-in middleware packages:
  - `@governor/openai`
  - `@governor/anthropic`
  - `@governor/gemini`
  - `@governor/langchain`
- Replay mode: rerun historical traces against new policy versions before rollout.
- CLI for local trace capture and upload during development.
- Synthetic load generator for governance stress testing.

### Operational Workflows
- Runbooks triggered by policy incidents (auto-create Jira, page on-call, open Slack thread).
- Tenant-level budget envelopes with progressive enforcement (warn -> approval -> block).
- Agent certification badges (policy test suite pass/fail per release).
- "Change windows" for policy updates with two-person approval and blast radius preview.

### Commercial Packaging
- Tiered plans:
  - Starter: basic gateway + dashboards.
  - Growth: approvals, policy simulator, anomaly alerts.
  - Enterprise: SSO/SCIM, signed audit, advanced integrations, data residency controls.
- Usage pricing dimensions:
  - governed calls
  - ingested events
  - retained run history
  - active agents/orgs

## Troubleshooting

### `REDIS_URL` missing or env parse errors
- Ensure `.env` exists (`make ensure-env`) and run through `make dev` so env defaults are injected.

### Clerk key errors in local dev
- Placeholder keys run local-mode UI. Use real Clerk keys in `.env` to enable auth.

### `EADDRINUSE` on port 3000/4000
- Stop previous processes on those ports, then rerun `make dev`.

### Next.js stale cache issues
- Stop dev server, remove `apps/console/.next`, restart `make dev`.

## Testing

- Policy engine unit tests:
```bash
pnpm --filter @governor/policy-engine test
```

- API integration tests:
```bash
pnpm --filter @governor/api test
```

- Full workspace:
```bash
pnpm build
pnpm test
```
