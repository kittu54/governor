/**
 * Governor + LangChain integration example.
 *
 * Demonstrates wrapping LangChain-style tools with Governor governance.
 * Every tool invocation flows through Governor policy evaluation before
 * the underlying tool is executed.
 *
 * Usage:
 *   GOVERNOR_ORG_ID=org_demo_1 GOVERNOR_AGENT_ID=agent_data_1 \
 *     npx tsx examples/langchain-agent/index.ts
 */

import {
  createGovernorFromEnv,
  GovernorDeniedError,
  GovernorApprovalRequiredError,
} from "@governor/sdk";

// ── 1. Initialize Governor ──────────────────────────────────────

const governor = createGovernorFromEnv();

// ── 2. Define tool implementations ─────────────────────────────

async function queryDatabase(args: { query: string }) {
  console.log(`  [postgres] Executing: ${args.query}`);
  return { rows: [{ id: 1, name: "Acme Corp", balance: 42_500 }], rowCount: 1 };
}

async function writeFile(args: { path: string; content: string }) {
  console.log(`  [fs] Writing ${args.content.length} bytes to ${args.path}`);
  return { written: true, bytes: args.content.length };
}

async function exportToS3(args: { bucket: string; key: string; data: string }) {
  console.log(`  [s3] Uploading to s3://${args.bucket}/${args.key}`);
  return { etag: `"${Date.now()}"`, size: args.data.length };
}

// ── 3. Create governed LangChain tools ──────────────────────────
// governor.wrapLangChainTool returns { name, invoke } compatible with
// LangChain's DynamicTool pattern.

const dbTool = governor.wrapLangChainTool("postgres_query", queryDatabase);

const fileTool = governor.wrapLangChainTool("file_write", writeFile);

const exportTool = governor.wrapLangChainTool("s3_export", exportToS3);

// ── 4. Simulate a LangChain agent executor ──────────────────────

async function agentExecutor() {
  const tools = [dbTool, fileTool, exportTool];

  console.log("LangChain Agent starting...");
  console.log(`  Registered tools: ${tools.map((t) => t.name).join(", ")}\n`);

  // Step 1: query database — typically low risk
  try {
    console.log("Action: postgres_query");
    const result = await dbTool.invoke({ query: "SELECT * FROM accounts LIMIT 10" });
    console.log(`  Returned ${result.rowCount} rows\n`);
  } catch (err) {
    handleError(err, "postgres_query");
  }

  // Step 2: write a local file — medium risk (FILE_MUTATION)
  try {
    console.log("Action: file_write");
    const result = await fileTool.invoke({
      path: "/tmp/report.csv",
      content: "id,name,balance\n1,Acme Corp,42500",
    });
    console.log(`  Wrote ${result.bytes} bytes\n`);
  } catch (err) {
    handleError(err, "file_write");
  }

  // Step 3: export data to S3 — high risk (DATA_EXPORT)
  try {
    console.log("Action: s3_export");
    const result = await exportTool.invoke({
      bucket: "analytics-prod",
      key: "exports/accounts.csv",
      data: "id,name,balance\n1,Acme Corp,42500",
    });
    console.log(`  Uploaded, etag=${result.etag}\n`);
  } catch (err) {
    handleError(err, "s3_export");
  }

  console.log("Agent run complete.");
}

function handleError(err: unknown, toolName: string) {
  if (err instanceof GovernorDeniedError) {
    console.log(`  DENIED: ${err.reason} (risk: ${err.risk_class})\n`);
  } else if (err instanceof GovernorApprovalRequiredError) {
    console.log(`  NEEDS APPROVAL: request ${err.approval_request_id}\n`);
  } else {
    console.error(`  Error in ${toolName}:`, err);
  }
}

agentExecutor().catch(console.error);
