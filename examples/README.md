# Governor Integration Examples

Working examples showing how to integrate Governor governance into different AI agent frameworks and tool systems.

## Quick Start

The fastest way to try Governor:

```bash
# Start Governor locally
make dev

# Run the quickstart example
GOVERNOR_ORG_ID=org_demo GOVERNOR_AGENT_ID=my-agent \
  npx tsx examples/quickstart/index.ts
```

## Examples

| Example | Description | Complexity |
|---------|-------------|------------|
| [quickstart](./quickstart/) | **Start here.** Protect an agent in 3 lines with `protectAgent()` | Minimal |
| [openai-agent](./openai-agent/) | OpenAI function-calling tools with `wrapTool` | Standard |
| [langchain-agent](./langchain-agent/) | LangChain tools with `wrapLangChainTool` | Standard |
| [mcp-server](./mcp-server/) | MCP server dispatch with `evaluate()` | Standard |
| [internal-tool](./internal-tool/) | Internal pipeline with telemetry runs | Advanced |

## Prerequisites

1. Governor running locally: `make dev`
2. Node.js 20+

## How It Works

### Zero-Config Protection (`protectAgent`)

```typescript
import { protectAgent } from "@governor/sdk";

const agent = protectAgent({
  "stripe.refund": issueRefund,
  "email.send": sendEmail,
  "shell.exec": runShell,
});

// Every call is now governed
await agent.call("stripe.refund", { amount: 500 });
```

`protectAgent()` automatically:
- Registers tools with the Governor API
- Classifies risk for each tool
- Installs the AI Action Firewall (default guardrails)
- Wraps every tool call with policy evaluation
- Logs all actions to the audit ledger

### Default Firewall Rules

| Risk Class | Default Action | Example |
|------------|---------------|---------|
| `CODE_EXECUTION` | **Deny** | `shell.exec` |
| `CREDENTIAL_USE` | **Deny** | `vault.get` |
| `FILE_MUTATION` (delete) | **Deny** | `fs.delete` |
| `MONEY_MOVEMENT` > $200 | **Require Approval** | `stripe.refund` |
| `DATA_EXPORT` | **Require Approval** | `s3.export` |
| `EXTERNAL_COMMUNICATION` | **Require Approval** | `email.send` |
| `ADMIN_ACTION` | **Require Approval** | `admin.delete_user` |
| `PII_ACCESS` | **Require Approval** | `customer.lookup_pii` |
| `DATA_WRITE` | **Allow + Audit** | `postgres.update` |
| `LOW_RISK` | **Allow + Audit** | `database.read` |

### Manual Wrapping (Advanced)

```typescript
import { createGovernorFromEnv } from "@governor/sdk";

const governor = createGovernorFromEnv();

const governedRefund = governor.wrapTool({
  tool_name: "stripe",
  tool_action: "refund",
  handler: issueRefund,
  costEstimator: (args) => args.amount * 0.01,
});
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOVERNOR_ORG_ID` | Yes | — | Organization ID |
| `GOVERNOR_AGENT_ID` | Yes | — | Agent identifier |
| `GOVERNOR_API_BASE_URL` | No | `http://localhost:4000` | Governor API endpoint |
| `GOVERNOR_API_KEY` | No | — | API key for authentication |
| `GOVERNOR_ENVIRONMENT` | No | `DEV` | `DEV`, `STAGING`, or `PROD` |

## After Running

1. Open the Governor Console: http://localhost:3000
2. Navigate to **Actions** to see all governed tool invocations
3. Click any action to see the full evaluation trace
4. Check **Approvals** for pending approval requests
