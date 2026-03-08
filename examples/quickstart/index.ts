/**
 * Governor Quickstart — Protect an agent in 3 lines.
 *
 * This is the simplest way to add Governor protection to any AI agent.
 * The AI Action Firewall activates automatically with safe defaults.
 *
 * Usage:
 *   GOVERNOR_ORG_ID=org_demo GOVERNOR_AGENT_ID=my-agent \
 *     npx tsx examples/quickstart/index.ts
 */

import { protectAgent, GovernorDeniedError, GovernorApprovalRequiredError } from "@governor/sdk";

// ── Your existing tools ─────────────────────────────────────────

async function issueRefund(args: { order_id: string; amount: number }) {
  console.log(`  [stripe] Refunding $${args.amount} for ${args.order_id}`);
  return { success: true, refund_id: `re_${Date.now()}` };
}

async function sendEmail(args: { to: string; subject: string }) {
  console.log(`  [email] Sending to ${args.to}: "${args.subject}"`);
  return { sent: true };
}

async function readDatabase(args: { query: string }) {
  console.log(`  [db] Running query: ${args.query}`);
  return { rows: [{ id: 1, name: "Jane" }] };
}

async function deleteFile(args: { path: string }) {
  console.log(`  [fs] Deleting ${args.path}`);
  return { deleted: true };
}

async function runShell(args: { command: string }) {
  console.log(`  [shell] Executing: ${args.command}`);
  return { stdout: "ok", exit_code: 0 };
}

// ── Protect all tools with Governor ─────────────────────────────
// One line. Zero configuration. Instant protection.

const agent = protectAgent({
  "stripe.refund": issueRefund,
  "email.send": sendEmail,
  "database.read": readDatabase,
  "fs.delete": deleteFile,
  "shell.exec": runShell,
});

// ── Run the agent ───────────────────────────────────────────────

async function main() {
  console.log("🛡️  Governor Quickstart\n");

  // LOW RISK: Database read — allowed automatically
  try {
    console.log("1. Database read (LOW_RISK):");
    await agent.call("database.read", { query: "SELECT * FROM users LIMIT 1" });
    console.log("   ✓ Allowed\n");
  } catch (err) {
    handleError(err);
  }

  // MEDIUM RISK: Email send — requires approval
  try {
    console.log("2. Send email (EXTERNAL_COMMUNICATION):");
    await agent.call("email.send", { to: "jane@example.com", subject: "Your refund" });
    console.log("   ✓ Allowed\n");
  } catch (err) {
    handleError(err);
  }

  // HIGH RISK: Refund — requires approval over $200
  try {
    console.log("3. Issue refund $500 (MONEY_MOVEMENT):");
    await agent.call("stripe.refund", { order_id: "ord_123", amount: 500 });
    console.log("   ✓ Allowed\n");
  } catch (err) {
    handleError(err);
  }

  // CRITICAL: File deletion — denied by default
  try {
    console.log("4. Delete file (FILE_MUTATION):");
    await agent.call("fs.delete", { path: "/etc/passwd" });
    console.log("   ✓ Allowed\n");
  } catch (err) {
    handleError(err);
  }

  // CRITICAL: Shell execution — denied by default
  try {
    console.log("5. Shell exec (CODE_EXECUTION):");
    await agent.call("shell.exec", { command: "rm -rf /" });
    console.log("   ✓ Allowed\n");
  } catch (err) {
    handleError(err);
  }

  const consoleUrl = process.env.GOVERNOR_CONSOLE_URL ?? "https://agentgovernor.vercel.app";
  console.log(`Done. Check the Governor console at ${consoleUrl}/actions`);
}

function handleError(err: unknown) {
  if (err instanceof GovernorDeniedError) {
    console.log(`   ✗ DENIED: ${err.reason}`);
    console.log(`     Risk: ${err.risk_class} | Mode: ${err.enforcement_mode}\n`);
  } else if (err instanceof GovernorApprovalRequiredError) {
    console.log(`   ⏳ APPROVAL REQUIRED: ${err.reason}`);
    console.log(`     Approval ID: ${err.approval_request_id}\n`);
  } else {
    console.error(`   Error:`, (err as Error).message, "\n");
  }
}

main().catch(console.error);
