#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const VERSION = "0.1.0";
const CONFIG_FILE = ".governor.json";
const DEFAULT_API = "http://localhost:4000";

interface GovernorConfig {
  api_base_url: string;
  org_id: string;
  agent_id?: string;
  api_key?: string;
  environment?: string;
}

function loadConfig(): GovernorConfig | null {
  const configPath = resolve(process.cwd(), CONFIG_FILE);
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}

function saveConfig(config: GovernorConfig): void {
  writeFileSync(resolve(process.cwd(), CONFIG_FILE), JSON.stringify(config, null, 2) + "\n");
}

function getApiUrl(): string {
  return loadConfig()?.api_base_url ?? process.env.GOVERNOR_API_BASE_URL ?? DEFAULT_API;
}

function getOrgId(): string {
  return loadConfig()?.org_id ?? process.env.GOVERNOR_ORG_ID ?? "";
}

async function apiGet(path: string): Promise<unknown> {
  const url = `${getApiUrl()}/v1${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function apiPost(path: string, body: unknown): Promise<unknown> {
  const url = `${getApiUrl()}/v1${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`API error: ${res.status} ${(err as any)?.error ?? res.statusText}`);
  }
  return res.json();
}

function printTable(headers: string[], rows: string[][]): void {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
  const sep = widths.map((w) => "─".repeat(w + 2)).join("┼");

  console.log(headers.map((h, i) => ` ${h.padEnd(widths[i])} `).join("│"));
  console.log(sep);
  for (const row of rows) {
    console.log(row.map((c, i) => ` ${(c ?? "").padEnd(widths[i])} `).join("│"));
  }
}

async function cmdInit(): Promise<void> {
  console.log("🛡️  Governor Init\n");

  const orgId = process.argv[3] ?? `org_${Date.now().toString(36)}`;
  const agentId = process.argv[4] ?? "my-agent";

  const config: GovernorConfig = {
    api_base_url: process.env.GOVERNOR_API_BASE_URL ?? DEFAULT_API,
    org_id: orgId,
    agent_id: agentId,
    environment: "DEV",
  };

  saveConfig(config);
  console.log(`  Created ${CONFIG_FILE}`);
  console.log(`  org_id:   ${config.org_id}`);
  console.log(`  agent_id: ${config.agent_id}`);

  try {
    const result = await apiPost("/firewall/bootstrap", { org_id: orgId });
    console.log(`\n  Firewall: ${(result as any).message}`);
  } catch {
    console.log("\n  ⚠ Could not reach Governor API. Run 'governor start' first.");
  }

  console.log("\nNext steps:");
  console.log("  1. governor start      — start local development server");
  console.log("  2. governor status      — check firewall status");
  console.log("  3. Add to your agent:   import { protectAgent } from '@governor/sdk'");
}

async function cmdLogin(): Promise<void> {
  const apiKey = process.argv[3];
  const apiUrl = process.argv[4] ?? DEFAULT_API;

  if (!apiKey) {
    console.error("Usage: governor login <api_key> [api_url]");
    process.exit(1);
  }

  const config = loadConfig() ?? { api_base_url: apiUrl, org_id: "" };
  config.api_key = apiKey;
  config.api_base_url = apiUrl;

  try {
    const res = await fetch(`${apiUrl}/health`);
    if (res.ok) {
      console.log("✓ Connected to Governor API");
    }
  } catch {
    console.log("⚠ Cannot reach API at", apiUrl);
  }

  saveConfig(config);
  console.log(`  API key saved to ${CONFIG_FILE}`);
}

async function cmdStatus(): Promise<void> {
  const orgId = getOrgId();
  if (!orgId) {
    console.error("No org_id configured. Run 'governor init' first.");
    process.exit(1);
  }

  try {
    const status = (await apiGet(`/firewall/status?org_id=${encodeURIComponent(orgId)}`)) as any;
    console.log("🛡️  AI Action Firewall Status\n");
    console.log(`  Enabled:      ${status.enabled ? "✓ Yes" : "✗ No"}`);
    console.log(`  Installed:    ${status.installed_at ?? "—"}`);
    console.log(`  Total Rules:  ${status.rules_count}`);
    console.log(`  Deny Rules:   ${status.denial_rules_count}`);
    console.log(`  Thresholds:   ${status.approval_thresholds_count}`);
  } catch (err) {
    console.error("Error:", (err as Error).message);
  }
}

async function cmdInspect(): Promise<void> {
  const target = process.argv[3];
  const orgId = getOrgId();

  if (!target) {
    console.error("Usage: governor inspect <tool_name.tool_action | action_id>");
    process.exit(1);
  }

  if (target.includes(".")) {
    const [toolName, toolAction] = target.split(".", 2);
    try {
      const result = await apiPost(`/tools/classify-risk?org_id=${encodeURIComponent(orgId)}`, {
        tool_name: toolName,
        tool_action: toolAction,
      });
      const r = result as any;
      console.log(`\n🔍 Tool Classification: ${target}\n`);
      console.log(`  Risk Class:  ${r.risk_class}`);
      console.log(`  Severity:    ${r.severity}/100`);
      console.log(`  Confidence:  ${(r.confidence * 100).toFixed(0)}%`);
      console.log(`  Source:      ${r.source}`);
      console.log(`  Reason:      ${r.reason}`);
    } catch (err) {
      console.error("Error:", (err as Error).message);
    }
  } else {
    try {
      const action = (await apiGet(`/actions/${encodeURIComponent(target)}?org_id=${encodeURIComponent(orgId)}`)) as any;
      console.log(`\n🔍 Action: ${action.id}\n`);
      console.log(`  Tool:        ${action.tool_name}.${action.tool_action}`);
      console.log(`  Agent:       ${action.agent?.name ?? action.agent_id}`);
      console.log(`  Decision:    ${action.decision}`);
      console.log(`  Risk Class:  ${action.risk_class}`);
      console.log(`  Mode:        ${action.enforcement_mode}`);
      console.log(`  Cost:        $${action.cost_estimate_usd}`);
      console.log(`  Latency:     ${action.duration_ms ?? "—"}ms`);
      if (action.trace?.length > 0) {
        console.log("\n  Trace:");
        for (const t of action.trace) {
          console.log(`    [${t.code}] ${t.message}`);
        }
      }
    } catch (err) {
      console.error("Error:", (err as Error).message);
    }
  }
}

async function cmdActions(): Promise<void> {
  const orgId = getOrgId();
  const limit = process.argv[3] ?? "20";

  try {
    const data = (await apiGet(`/actions?org_id=${encodeURIComponent(orgId)}&limit=${limit}`)) as any;
    console.log(`\n🛡️  Recent Actions (${data.total} total)\n`);

    if (data.actions.length === 0) {
      console.log("  No actions recorded yet.");
      return;
    }

    printTable(
      ["Time", "Agent", "Tool", "Risk", "Decision", "Cost"],
      data.actions.map((a: any) => [
        new Date(a.timestamp).toLocaleTimeString(),
        a.agent_name ?? a.agent_id,
        `${a.tool_name}.${a.tool_action}`,
        a.risk_class,
        a.decision,
        `$${a.cost_estimate_usd.toFixed(2)}`,
      ]),
    );
  } catch (err) {
    console.error("Error:", (err as Error).message);
  }
}

async function cmdRules(): Promise<void> {
  try {
    const data = (await apiGet("/firewall/rules")) as any;
    console.log(`\n🛡️  Default Firewall Rules (${data.total})\n`);

    printTable(
      ["Risk Class", "Tool", "Action", "Decision", "Threshold", "Description"],
      data.rules.map((r: any) => [
        r.risk_class,
        r.tool_pattern,
        r.action_pattern,
        r.default_decision,
        r.threshold_usd ? `$${r.threshold_usd}` : "—",
        r.description,
      ]),
    );
  } catch (err) {
    console.error("Error:", (err as Error).message);
  }
}

async function cmdSimulate(): Promise<void> {
  const orgId = getOrgId();
  const agentId = loadConfig()?.agent_id ?? process.env.GOVERNOR_AGENT_ID ?? "test-agent";
  const tool = process.argv[3];
  const cost = process.argv[4] ?? "0";

  if (!tool || !tool.includes(".")) {
    console.error("Usage: governor simulate <tool_name.tool_action> [cost_usd]");
    process.exit(1);
  }

  const [toolName, toolAction] = tool.split(".", 2);

  try {
    const result = (await apiPost("/evaluate/simulate", {
      org_id: orgId,
      agent_id: agentId,
      tool_name: toolName,
      tool_action: toolAction,
      cost_estimate_usd: parseFloat(cost),
    })) as any;

    console.log(`\n🧪 Simulation: ${tool}\n`);
    console.log(`  Decision:    ${result.decision}`);
    console.log(`  Risk Class:  ${result.risk_class}`);
    console.log(`  Mode:        ${result.enforcement_mode}`);
    console.log(`  Reason:      ${result.reason}`);
    if (result.would_deny_in_prod) {
      console.log("  ⚠ Would be DENIED in production");
    }
    if (result.trace?.length > 0) {
      console.log("\n  Trace:");
      for (const t of result.trace) {
        console.log(`    [${t.code}] ${t.message}`);
      }
    }
  } catch (err) {
    console.error("Error:", (err as Error).message);
  }
}

async function cmdStart(): Promise<void> {
  console.log("🛡️  Governor Local Dev\n");
  console.log("  Starting local development environment...\n");
  console.log("  Run from the repository root:");
  console.log("    make dev");
  console.log("");
  console.log("  Or with Docker:");
  console.log("    docker-compose up");
  console.log("");
  console.log("  API:     http://localhost:4000");
  console.log("  Console: http://localhost:3000");
}

function printHelp(): void {
  console.log(`
🛡️  Governor CLI v${VERSION}
   AI Action Firewall for AI Agents

Usage: governor <command> [options]

Commands:
  init [org_id] [agent_id]     Initialize Governor in current project
  login <api_key> [api_url]    Authenticate with Governor API
  status                       Check firewall status
  actions [limit]              List recent actions
  inspect <tool|action_id>     Inspect a tool classification or action
  simulate <tool.action> [cost] Simulate a policy evaluation
  rules                        Show default firewall rules
  start                        Show local dev instructions

Environment Variables:
  GOVERNOR_API_BASE_URL   API endpoint (default: http://localhost:4000)
  GOVERNOR_ORG_ID         Organization ID
  GOVERNOR_AGENT_ID       Agent ID
  GOVERNOR_API_KEY        API key
  GOVERNOR_ENVIRONMENT    DEV | STAGING | PROD
`);
}

const command = process.argv[2];

switch (command) {
  case "init":       cmdInit(); break;
  case "login":      cmdLogin(); break;
  case "status":     cmdStatus(); break;
  case "actions":    cmdActions(); break;
  case "inspect":    cmdInspect(); break;
  case "simulate":   cmdSimulate(); break;
  case "rules":      cmdRules(); break;
  case "start":      cmdStart(); break;
  case "--version":
  case "-v":
    console.log(VERSION); break;
  case "--help":
  case "-h":
  case undefined:
    printHelp(); break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
