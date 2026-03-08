/**
 * Governor + OpenAI Agents SDK integration example.
 *
 * Shows how to wrap OpenAI function-calling tools with Governor governance
 * so every tool invocation is evaluated against policies, budgets, and
 * risk classification before execution.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... GOVERNOR_ORG_ID=org_demo_1 GOVERNOR_AGENT_ID=agent_support_1 \
 *     npx tsx examples/openai-agent/index.ts
 */

import { createGovernorFromEnv, GovernorDeniedError, GovernorApprovalRequiredError } from "@governor/sdk";

// ── 1. Initialize Governor ──────────────────────────────────────

const governor = createGovernorFromEnv();

// ── 2. Define your tools ────────────────────────────────────────

async function issueRefund(args: { order_id: string; amount: number; reason: string }) {
  console.log(`  [stripe] Refunding $${args.amount} for order ${args.order_id}`);
  return { success: true, refund_id: `re_${Date.now()}` };
}

async function sendEmail(args: { to: string; subject: string; body: string }) {
  console.log(`  [email] Sending to ${args.to}: "${args.subject}"`);
  return { sent: true, message_id: `msg_${Date.now()}` };
}

async function lookupCustomer(args: { customer_id: string }) {
  console.log(`  [db] Looking up customer ${args.customer_id}`);
  return { id: args.customer_id, name: "Jane Doe", email: "jane@example.com" };
}

// ── 3. Wrap tools with Governor ─────────────────────────────────

const governedRefund = governor.wrapTool({
  tool_name: "stripe",
  tool_action: "refund",
  handler: issueRefund,
  costEstimator: (args) => args.amount * 0.01,
  inputSummarizer: (args) => `Refund $${args.amount} for order ${args.order_id}`,
  outputSummarizer: (result) => `refund_id=${result.refund_id}`,
});

const governedEmail = governor.wrapTool({
  tool_name: "email",
  tool_action: "send",
  handler: sendEmail,
  inputSummarizer: (args) => `Email to ${args.to}: ${args.subject}`,
});

const governedLookup = governor.wrapTool({
  tool_name: "database",
  tool_action: "read",
  handler: lookupCustomer,
  inputSummarizer: (args) => `Lookup customer ${args.customer_id}`,
});

// ── 4. Simulate an agent run ────────────────────────────────────

async function runAgent() {
  console.log("Agent starting...\n");

  // Low-risk: database read — should always be allowed
  try {
    console.log("Step 1: Looking up customer...");
    const customer = await governedLookup({ customer_id: "cust_123" });
    console.log(`  Result: ${customer.name} (${customer.email})\n`);
  } catch (err) {
    handleGovernorError(err, "customer lookup");
  }

  // Medium-risk: sending email — may require approval in PROD
  try {
    console.log("Step 2: Sending confirmation email...");
    await governedEmail({ to: "jane@example.com", subject: "Refund processed", body: "Your refund has been issued." });
    console.log("  Email sent.\n");
  } catch (err) {
    handleGovernorError(err, "email send");
  }

  // High-risk: financial action — likely denied or requires approval in PROD
  try {
    console.log("Step 3: Issuing refund...");
    const result = await governedRefund({ order_id: "ord_456", amount: 150.0, reason: "Customer request" });
    console.log(`  Refund issued: ${result.refund_id}\n`);
  } catch (err) {
    handleGovernorError(err, "refund");
  }

  console.log("Agent complete.");
}

function handleGovernorError(err: unknown, action: string) {
  if (err instanceof GovernorDeniedError) {
    console.log(`  BLOCKED by Governor: ${err.reason}`);
    console.log(`  Risk class: ${err.risk_class}, Mode: ${err.enforcement_mode}\n`);
  } else if (err instanceof GovernorApprovalRequiredError) {
    console.log(`  APPROVAL REQUIRED: ${err.reason}`);
    console.log(`  Approval ID: ${err.approval_request_id}\n`);
  } else {
    console.error(`  Error during ${action}:`, err);
  }
}

runAgent().catch(console.error);
