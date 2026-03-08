/**
 * Governor Quickstart Script
 *
 * Run this after generating an API key in the Governor console:
 *
 *   GOVERNOR_API_KEY=gov_xxxxx npx tsx packages/sdk/examples/quickstart.ts
 *
 * Or set env vars in .env and run:
 *
 *   npx tsx packages/sdk/examples/quickstart.ts
 */

import { createGovernor } from "@governor/sdk";

const API_BASE = process.env.GOVERNOR_API_BASE_URL ?? process.env.GOVERNOR_API_URL ?? "https://api.governor.run";
const API_KEY = process.env.GOVERNOR_API_KEY;
const ORG_ID = process.env.GOVERNOR_ORG_ID ?? "org_demo_1";
const AGENT_ID = process.env.GOVERNOR_AGENT_ID ?? "quickstart_agent";

console.log("\n🚀 Governor Quickstart\n");
console.log(`   API:      ${API_BASE}`);
console.log(`   Org:      ${ORG_ID}`);
console.log(`   Agent:    ${AGENT_ID}`);
console.log(`   API Key:  ${API_KEY ? `${API_KEY.slice(0, 12)}...` : "(none — dev mode)"}\n`);

const gov = createGovernor({
    api_base_url: API_BASE,
    api_key: API_KEY,
    org_id: ORG_ID,
    agent_id: AGENT_ID
});

// ─── Step 1: Governed tool call ───────────────────────────────────

console.log("1️⃣  Evaluating a governed tool call...");

const wrappedTool = gov.wrapTool({
    tool_name: "http",
    tool_action: "GET",
    handler: async (url: string) => {
        console.log(`   → Calling tool: http.GET ${url}`);
        return { status: 200, body: "OK" };
    },
    costEstimator: () => 0.001,
    inputSummarizer: (url: string) => url,
    outputSummarizer: (result: { status: number }) => `status=${result.status}`
});

try {
    await wrappedTool("https://api.example.com/data");
    console.log("   ✅ Tool call ALLOWED and completed\n");
} catch (error) {
    if (error instanceof Error) {
        console.log(`   ⚠️  Tool call result: ${error.message}\n`);
    }
}

// ─── Step 2: Send telemetry run ───────────────────────────────────

console.log("2️⃣  Sending a telemetry run with events...");

const run = gov.createTelemetryRun({
    run_id: `quickstart_run_${Date.now()}`,
    source: "CUSTOM",
    provider: "quickstart",
    model: "demo-model",
    task_name: "quickstart_demo"
});

await run.start();
console.log("   → RUN_STARTED");

await run.modelCall({ prompt: "Summarize the latest support tickets" });
console.log("   → MODEL_CALL");

await run.modelResult({
    input_tokens: 450,
    output_tokens: 120,
    cost_usd: 0.005,
    latency_ms: 620,
    output_payload: { summary: "3 tickets resolved, 1 escalated" }
});
console.log("   → MODEL_RESULT");

await run.toolCall({
    tool_name: "jira",
    tool_action: "create_ticket",
    input_payload: { title: "Follow-up on escalation" }
});
console.log("   → TOOL_CALL");

await run.toolResult({
    tool_name: "jira",
    tool_action: "create_ticket",
    cost_usd: 0.001,
    latency_ms: 340,
    output_payload: { ticket_id: "SUPPORT-42" }
});
console.log("   → TOOL_RESULT");

await run.complete({ outcome: "success" });
console.log("   → RUN_COMPLETED");

console.log("   ✅ Telemetry run sent successfully\n");

// ─── Done ─────────────────────────────────────────────────────────

console.log("🎉 Quickstart complete!\n");
const CONSOLE_URL = process.env.GOVERNOR_CONSOLE_URL ?? "https://agentgovernor.vercel.app";
console.log("   Open the Governor console to see your data:");
console.log(`   → Actions:   ${CONSOLE_URL}/actions`);
console.log(`   → Runs:      ${CONSOLE_URL}/runs`);
console.log(`   → Overview:  ${CONSOLE_URL}/overview\n`);
