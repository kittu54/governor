/**
 * Governor integration for internal/custom tool frameworks.
 *
 * Demonstrates how any tool-using system — internal scripts, cron jobs,
 * workflow engines, or custom agent frameworks — can integrate Governor
 * for governance, risk controls, and audit.
 *
 * Usage:
 *   GOVERNOR_ORG_ID=org_demo_1 GOVERNOR_AGENT_ID=agent_internal_1 \
 *     npx tsx examples/internal-tool/index.ts
 */

import {
  createGovernor,
  GovernorDeniedError,
  GovernorApprovalRequiredError,
} from "@governor/sdk";

// ── 1. Initialize Governor with explicit config ─────────────────

const governor = createGovernor({
  api_base_url: process.env.GOVERNOR_API_BASE_URL ?? process.env.GOVERNOR_API_URL ?? "https://api.governor.run",
  org_id: process.env.GOVERNOR_ORG_ID ?? "org_demo_1",
  agent_id: process.env.GOVERNOR_AGENT_ID ?? "agent_internal_1",
  api_key: process.env.GOVERNOR_API_KEY ?? "dev-local-key",
  environment: "PROD",
  on_error: "throw",
  on_enforcement_warning: (warning) => {
    console.warn(`  ⚠ Enforcement warning: ${warning.warnings.join("; ")}`);
    console.warn(`    Risk: ${warning.risk_class}, Would deny in PROD: ${warning.would_deny_in_prod}`);
  },
});

// ── 2. Example: batch data processing pipeline ─────────────────

async function fetchRecords(args: { table: string; limit: number }) {
  console.log(`  [db] SELECT * FROM ${args.table} LIMIT ${args.limit}`);
  return { records: Array.from({ length: args.limit }, (_, i) => ({ id: i + 1 })) };
}

async function transformAndUpload(args: { destination: string; recordCount: number }) {
  console.log(`  [etl] Uploading ${args.recordCount} records to ${args.destination}`);
  return { uploaded: args.recordCount, destination: args.destination };
}

async function notifyTeam(args: { channel: string; message: string }) {
  console.log(`  [notify] ${args.channel}: ${args.message}`);
  return { delivered: true };
}

// ── 3. Wrap with Governor governance ────────────────────────────

const governedFetch = governor.wrapTool({
  tool_name: "internal_db",
  tool_action: "read",
  handler: fetchRecords,
  inputSummarizer: (args) => `Read ${args.limit} records from ${args.table}`,
});

const governedUpload = governor.wrapTool({
  tool_name: "internal_etl",
  tool_action: "upload",
  handler: transformAndUpload,
  costEstimator: (args) => args.recordCount * 0.001,
  inputSummarizer: (args) => `Upload ${args.recordCount} records to ${args.destination}`,
});

const governedNotify = governor.wrapTool({
  tool_name: "internal_notify",
  tool_action: "send",
  handler: notifyTeam,
  inputSummarizer: (args) => `Notify ${args.channel}: ${args.message}`,
});

// ── 4. Run the pipeline ─────────────────────────────────────────

async function runPipeline() {
  console.log("Data pipeline starting (governed by Governor)...\n");

  // Use telemetry to track the entire pipeline as a run
  const run = governor.createTelemetryRun({
    run_id: `pipeline_${Date.now()}`,
    source: "CUSTOM",
    task_name: "daily_export",
    tags: ["scheduled", "etl"],
  });

  await run.start();

  try {
    // Step 1: fetch records
    console.log("Step 1: Fetch records");
    const data = await governedFetch({ table: "customers", limit: 100 });
    console.log(`  Fetched ${data.records.length} records\n`);
    await run.step("fetch_complete", { recordCount: data.records.length });

    // Step 2: transform + upload
    console.log("Step 2: Transform and upload");
    const upload = await governedUpload({ destination: "s3://reports/daily", recordCount: data.records.length });
    console.log(`  Uploaded ${upload.uploaded} records\n`);
    await run.step("upload_complete", { destination: upload.destination });

    // Step 3: notify team
    console.log("Step 3: Notify team");
    await governedNotify({ channel: "#data-ops", message: `Daily export complete: ${upload.uploaded} records` });
    console.log("  Team notified\n");

    await run.complete({ totalRecords: upload.uploaded });
    console.log("Pipeline complete.");
  } catch (err) {
    if (err instanceof GovernorDeniedError) {
      console.error(`\nPipeline BLOCKED by Governor: ${err.reason}`);
      console.error(`  Risk: ${err.risk_class}, Mode: ${err.enforcement_mode}`);
      await run.fail(err);
    } else if (err instanceof GovernorApprovalRequiredError) {
      console.error(`\nPipeline PAUSED — approval required: ${err.approval_request_id}`);
      await run.fail(err);
    } else {
      await run.fail(err as Error);
      throw err;
    }
  }
}

runPipeline().catch(console.error);
