/**
 * Governor + MCP Server governance example.
 *
 * Shows how to govern tool calls flowing through a Model Context Protocol
 * server. Every MCP tool invocation is intercepted by Governor to enforce
 * policies, budgets, rate limits, and approvals.
 *
 * This example simulates an MCP server that exposes three tools. In
 * production you would integrate Governor.evaluate() into your MCP
 * server's tool dispatch layer.
 *
 * Usage:
 *   GOVERNOR_ORG_ID=org_demo_1 GOVERNOR_AGENT_ID=agent_mcp_1 \
 *     npx tsx examples/mcp-server/index.ts
 */

import {
  createGovernorFromEnv,
  GovernorDeniedError,
  GovernorApprovalRequiredError,
} from "@governor/sdk";

// ── 1. Initialize Governor ──────────────────────────────────────

const governor = createGovernorFromEnv();

// ── 2. Simulated MCP tool definitions ───────────────────────────

interface MCPToolDef {
  name: string;
  description: string;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

const mcpTools: MCPToolDef[] = [
  {
    name: "github_create_issue",
    description: "Create a GitHub issue",
    handler: async (args) => {
      console.log(`  [github] Creating issue in ${args.repo}: "${args.title}"`);
      return { issue_number: 42, url: `https://github.com/${args.repo}/issues/42` };
    },
  },
  {
    name: "slack_post_message",
    description: "Post a message to Slack",
    handler: async (args) => {
      console.log(`  [slack] Posting to #${args.channel}: "${args.text}"`);
      return { ok: true, ts: `${Date.now()}` };
    },
  },
  {
    name: "aws_lambda_invoke",
    description: "Invoke an AWS Lambda function",
    handler: async (args) => {
      console.log(`  [aws] Invoking lambda ${args.function_name}`);
      return { statusCode: 200, payload: '{"result": "ok"}' };
    },
  },
];

// ── 3. MCP dispatch layer with Governor governance ──────────────

const ORG_ID = process.env.GOVERNOR_ORG_ID ?? "org_demo_1";
const AGENT_ID = process.env.GOVERNOR_AGENT_ID ?? "agent_mcp_1";

async function handleMCPToolCall(toolName: string, args: Record<string, unknown>) {
  const tool = mcpTools.find((t) => t.name === toolName);
  if (!tool) throw new Error(`Unknown MCP tool: ${toolName}`);

  const evaluation = await governor.evaluate({
    org_id: ORG_ID,
    agent_id: AGENT_ID,
    tool_name: toolName,
    tool_action: "invoke",
    input_summary: JSON.stringify(args).slice(0, 200),
  });

  if (evaluation.decision === "DENY") {
    throw new GovernorDeniedError(
      evaluation.reason ?? "Denied by policy",
      evaluation.trace ?? [],
      evaluation.reason,
      { risk_class: evaluation.risk_class, enforcement_mode: evaluation.enforcement_mode },
    );
  }

  if (evaluation.decision === "REQUIRE_APPROVAL") {
    throw new GovernorApprovalRequiredError(
      evaluation.reason ?? "Approval required",
      evaluation.approval_request_id,
      evaluation.trace ?? [],
      evaluation.reason,
      { risk_class: evaluation.risk_class },
    );
  }

  return tool.handler(args);
}

// ── 4. Simulate MCP tool invocations ────────────────────────────

async function main() {
  console.log("MCP Server started with Governor governance\n");
  console.log(`  Tools: ${mcpTools.map((t) => t.name).join(", ")}\n`);

  const calls = [
    { tool: "github_create_issue", args: { repo: "acme/app", title: "Fix login bug", body: "Login fails on mobile" } },
    { tool: "slack_post_message", args: { channel: "engineering", text: "Deploy v2.1 complete" } },
    { tool: "aws_lambda_invoke", args: { function_name: "process-payments", payload: '{"batch_id": 42}' } },
  ];

  for (const call of calls) {
    console.log(`─── MCP tool_call: ${call.tool} ───`);
    try {
      const result = await handleMCPToolCall(call.tool, call.args);
      console.log(`  Result: ${JSON.stringify(result)}\n`);
    } catch (err) {
      if (err instanceof GovernorDeniedError) {
        console.log(`  BLOCKED: ${err.reason} (risk: ${err.risk_class})\n`);
      } else if (err instanceof GovernorApprovalRequiredError) {
        console.log(`  APPROVAL NEEDED: ${err.approval_request_id}\n`);
      } else {
        console.error(`  Error:`, err);
      }
    }
  }

  console.log("MCP Server demo complete.");
}

main().catch(console.error);
