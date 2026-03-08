# Governor Integration Examples

Working examples showing how to integrate Governor governance into different AI agent frameworks and tool systems.

## Examples

| Example | Description | Risk Level |
|---------|-------------|------------|
| [openai-agent](./openai-agent/) | OpenAI function-calling tools with `wrapTool` | Mixed |
| [langchain-agent](./langchain-agent/) | LangChain tools with `wrapLangChainTool` | Mixed |
| [mcp-server](./mcp-server/) | MCP server dispatch with `evaluate()` | Mixed |
| [internal-tool](./internal-tool/) | Internal pipeline with telemetry runs | Mixed |

## Prerequisites

1. Governor API running locally:

```bash
# From repository root
make dev
```

2. Seed data loaded:

```bash
cd apps/api && npx prisma db seed
```

## Running Examples

```bash
# Set environment (or use .env in repo root)
export GOVERNOR_API_BASE_URL=http://localhost:4000
export GOVERNOR_API_KEY=dev-local-key
export GOVERNOR_ORG_ID=org_demo_1
export GOVERNOR_ENVIRONMENT=DEV

# Run any example
npx tsx examples/openai-agent/index.ts
npx tsx examples/langchain-agent/index.ts
npx tsx examples/mcp-server/index.ts
npx tsx examples/internal-tool/index.ts
```

## Integration Patterns

### Pattern 1: `wrapTool` (recommended)

Best for frameworks where you define tool handlers as functions. Governor intercepts every call, evaluates policy, and either allows or blocks execution.

```typescript
import { createGovernorFromEnv } from "@governor/sdk";

const governor = createGovernorFromEnv();

const governed = governor.wrapTool({
  tool_name: "stripe",
  tool_action: "refund",
  handler: issueRefund,
  costEstimator: (args) => args.amount * 0.01,
});

const result = await governed({ order_id: "ord_1", amount: 50 });
```

### Pattern 2: `wrapLangChainTool`

Returns a `{ name, invoke }` object compatible with LangChain's tool interface.

```typescript
const tool = governor.wrapLangChainTool("sql_query", queryDb);
const result = await tool.invoke({ query: "SELECT ..." });
```

### Pattern 3: Direct `evaluate()`

For full control — call `evaluate()` yourself and handle the decision.

```typescript
const evaluation = await governor.evaluate({
  tool_name: "aws_lambda",
  tool_action: "invoke",
  input_summary: "process-payments",
});

if (evaluation.decision === "DENY") {
  throw new Error(`Blocked: ${evaluation.reason}`);
}

// Execute the tool only if allowed
await invokeLambda(args);
```

### Pattern 4: Telemetry Runs

Track multi-step agent runs for observability and analytics.

```typescript
const run = governor.createTelemetryRun({
  run_id: "run_123",
  source: "cron_job",
  task_name: "daily_report",
});

await run.start();
await run.step("fetched_data", { rows: 100 });
await run.complete({ success: true });
```

## Enforcement Modes

| Mode | Behavior |
|------|----------|
| `DEV` | Allow all, log warnings for sensitive actions |
| `STAGING` | Allow all, warn with `would_deny_in_prod` flag |
| `PROD` | Deny sensitive actions unless explicitly allowed by policy |

Set via `GOVERNOR_ENVIRONMENT` env var or `environment` in config.

## Error Handling

```typescript
import { GovernorDeniedError, GovernorApprovalRequiredError } from "@governor/sdk";

try {
  await governedTool(args);
} catch (err) {
  if (err instanceof GovernorDeniedError) {
    // Tool call was blocked by policy
    console.log(err.reason, err.risk_class, err.enforcement_mode);
  } else if (err instanceof GovernorApprovalRequiredError) {
    // Tool call needs human approval before proceeding
    console.log(err.approval_request_id);
  }
}
```
