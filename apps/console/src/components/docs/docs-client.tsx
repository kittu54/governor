"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Rocket, Shield, Key, Code, Terminal, Server, Zap,
  FileText, AlertTriangle, CheckCircle, Copy, ExternalLink,
  Bot, Layers, ArrowRight, Lock, Eye, Activity, Webhook, Clock,
} from "lucide-react";

type Section =
  | "overview"
  | "quickstart"
  | "sdk"
  | "api"
  | "gateway"
  | "policies"
  | "firewall"
  | "approvals"
  | "examples"
  | "self-host";

const sections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "quickstart", label: "Quick Start", icon: Rocket },
  { id: "sdk", label: "SDK Reference", icon: Code },
  { id: "api", label: "API Reference", icon: Server },
  { id: "gateway", label: "Gateway", icon: Shield },
  { id: "policies", label: "Policies", icon: FileText },
  { id: "firewall", label: "AI Firewall", icon: AlertTriangle },
  { id: "approvals", label: "Approvals", icon: CheckCircle },
  { id: "examples", label: "Examples", icon: Terminal },
  { id: "self-host", label: "Self-Hosting", icon: Layers },
];

export function DocsClient() {
  const [active, setActive] = useState<Section>("overview");
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <nav className="hidden lg:block w-48 shrink-0 space-y-1 sticky top-6 self-start">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 mb-2">Documentation</p>
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                active === s.id ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Mobile section picker */}
        <div className="lg:hidden">
          <select
            value={active}
            onChange={(e) => setActive(e.target.value as Section)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        {active === "overview" && <OverviewSection />}
        {active === "quickstart" && <QuickStartSection copy={copy} copied={copied} />}
        {active === "sdk" && <SDKSection copy={copy} copied={copied} />}
        {active === "api" && <APISection copy={copy} copied={copied} />}
        {active === "gateway" && <GatewaySection copy={copy} copied={copied} />}
        {active === "policies" && <PoliciesSection />}
        {active === "firewall" && <FirewallSection />}
        {active === "approvals" && <ApprovalsSection />}
        {active === "examples" && <ExamplesSection copy={copy} copied={copied} />}
        {active === "self-host" && <SelfHostSection copy={copy} copied={copied} />}
      </div>
    </div>
  );
}

/* ─── Code Block ─────────────────────────────────────────── */

function CodeBlock({ code, label, lang, copy, copied }: { code: string; label: string; lang?: string; copy: (t: string, l: string) => void; copied: string | null }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{lang ?? label}</span>
        <button onClick={() => copy(code, label)} className="text-muted-foreground hover:text-foreground text-xs">
          {copied === label ? <span className="text-emerald-400">Copied!</span> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <pre className="p-4 font-mono text-xs text-foreground overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-bold text-foreground">{children}</h1>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-foreground mt-8 mb-3">{children}</h2>;
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>;
}

/* ─── Overview ───────────────────────────────────────────── */

function OverviewSection() {
  return (
    <div className="space-y-6">
      <div>
        <Heading>Governor Documentation</Heading>
        <Paragraph>
          Governor is an AI governance platform that sits between your AI agents and the tools they use.
          Every tool invocation is evaluated against policies, budgets, rate limits, and risk classification
          before execution — giving you full visibility and control over what your agents do.
        </Paragraph>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: Shield, title: "AI Action Firewall", desc: "Automatic risk classification and default deny for dangerous operations like code execution and credential access." },
          { icon: Eye, title: "Full Audit Trail", desc: "Every tool call, policy evaluation, and approval decision is logged with a complete trace." },
          { icon: CheckCircle, title: "Human-in-the-Loop", desc: "High-risk actions can require human approval before execution. Approve, deny, or escalate from the dashboard." },
          { icon: Zap, title: "Zero-Config Start", desc: "One function call to protect all your agent's tools. No policy configuration required to get started." },
          { icon: Lock, title: "Multi-Tenant", desc: "Every resource is org-scoped. API keys, policies, agents, and audit logs are isolated per organization." },
          { icon: Activity, title: "Real-Time Metrics", desc: "Monitor action volume, blocked percentage, pending approvals, costs, and risk distribution in real-time." },
        ].map((item) => (
          <Card key={item.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <item.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{item.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SubHeading>Architecture</SubHeading>
      <Card>
        <CardContent className="p-4">
          <div className="font-mono text-xs text-foreground space-y-2">
            <p>Your Agent → <span className="text-primary">Governor SDK</span> → Governor API → Policy Engine</p>
            <p className="text-muted-foreground">{"                                                "}↓</p>
            <p className="text-muted-foreground">{"                                      "}Risk Classifier</p>
            <p className="text-muted-foreground">{"                                      "}Budget Tracker</p>
            <p className="text-muted-foreground">{"                                      "}Rate Limiter</p>
            <p className="text-muted-foreground">{"                                      "}Approval Manager</p>
            <p className="text-muted-foreground">{"                                                "}↓</p>
            <p>Decision: <span className="text-emerald-400">ALLOW</span> | <span className="text-amber-400">REQUIRE_APPROVAL</span> | <span className="text-red-400">DENY</span></p>
          </div>
        </CardContent>
      </Card>

      <SubHeading>Core Concepts</SubHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { term: "Organization", desc: "Top-level tenant. All resources (agents, policies, keys) belong to an org." },
          { term: "Agent", desc: "An AI agent or service that uses tools. Identified by agent_id." },
          { term: "Tool", desc: "A function or capability an agent can invoke (e.g. stripe.refund)." },
          { term: "Action", desc: "A single tool invocation logged by Governor with full evaluation trace." },
          { term: "Policy", desc: "Rules that govern tool usage: allow/deny rules, budgets, rate limits, thresholds." },
          { term: "Evaluation", desc: "The result of evaluating a tool call against all applicable policies." },
          { term: "Approval", desc: "A human review request for high-risk actions." },
          { term: "Risk Class", desc: "Automatic classification: LOW_RISK, DATA_WRITE, PII_ACCESS, MONEY_MOVEMENT, CODE_EXECUTION, etc." },
        ].map((item) => (
          <div key={item.term} className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <p className="text-sm font-medium text-foreground">{item.term}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Quick Start ────────────────────────────────────────── */

function QuickStartSection({ copy, copied }: { copy: (t: string, l: string) => void; copied: string | null }) {
  return (
    <div className="space-y-6">
      <div>
        <Heading>Quick Start</Heading>
        <Paragraph>Go from zero to governed agent in under 5 minutes.</Paragraph>
      </div>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">1</div> Install the SDK</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock copy={copy} copied={copied} label="install" lang="bash" code="npm install @governor/sdk" />
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">2</div> Set Environment Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock copy={copy} copied={copied} label="env" lang="bash" code={`GOVERNOR_API_KEY=gov_your_api_key_here
GOVERNOR_ORG_ID=org_your_org_id
GOVERNOR_AGENT_ID=my-agent

# Only for self-hosted — hosted uses https://api.governor.run automatically
# GOVERNOR_API_BASE_URL=http://localhost:4000`} />
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">3</div> Protect Your Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock copy={copy} copied={copied} label="protect" lang="typescript" code={`import { protectAgent } from "@governor/sdk"

const agent = protectAgent({
  "stripe.refund": issueRefund,
  "email.send": sendEmail,
  "database.read": queryDB,
  "shell.exec": runShell,
})

// Every call is now governed by Governor
await agent.call("stripe.refund", { order_id: "ord_123", amount: 500 })
// → DENIED: MONEY_MOVEMENT over threshold

await agent.call("database.read", { query: "SELECT * FROM users" })
// → ALLOWED + audited

await agent.call("shell.exec", { command: "ls -la" })
// → DENIED: CODE_EXECUTION blocked by firewall`} />
        </CardContent>
      </Card>

      <Card className="border-emerald-500/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">4</div> View in Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Paragraph>
            Open the Governor dashboard and navigate to Actions. You'll see every tool call with its evaluation trace,
            risk classification, and decision. Pending approval requests appear in the Approvals tab.
          </Paragraph>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── SDK Reference ──────────────────────────────────────── */

function SDKSection({ copy, copied }: { copy: (t: string, l: string) => void; copied: string | null }) {
  return (
    <div className="space-y-6">
      <div>
        <Heading>SDK Reference</Heading>
        <Paragraph>The @governor/sdk package provides TypeScript-first tools for integrating Governor governance.</Paragraph>
      </div>

      <SubHeading>protectAgent(tools)</SubHeading>
      <Paragraph>
        The simplest way to add governance. Pass a map of tool names to handler functions. Governor automatically
        registers tools, classifies risk, installs the AI Action Firewall, and wraps every call with policy evaluation.
      </Paragraph>
      <CodeBlock copy={copy} copied={copied} label="protectAgent" lang="typescript" code={`import { protectAgent } from "@governor/sdk"

const agent = protectAgent({
  "stripe.refund": async (args: { order_id: string; amount: number }) => {
    return { success: true, refund_id: "re_123" }
  },
  "email.send": async (args: { to: string; subject: string }) => {
    return { sent: true }
  },
})

// Type-safe tool invocation
const result = await agent.call("stripe.refund", { order_id: "ord_1", amount: 99 })

// Get tools formatted for OpenAI function calling
const openaiTools = agent.toOpenAI()

// Get tools formatted for LangChain
const langchainTools = agent.toLangChain()`} />

      <SubHeading>createGovernor(config)</SubHeading>
      <Paragraph>
        Manual initialization with explicit configuration. Use when you need fine-grained control.
      </Paragraph>
      <CodeBlock copy={copy} copied={copied} label="createGovernor" lang="typescript" code={`import { createGovernor } from "@governor/sdk"

const governor = createGovernor({
  api_base_url: "https://api.governor.run",
  api_key: "gov_your_key",
  org_id: "org_your_org",
  agent_id: "my-agent",
  environment: "PROD",      // DEV | STAGING | PROD
  on_error: "throw",        // "throw" | "allow" | "deny"
  on_enforcement_warning: (warning) => {
    console.warn(warning.warnings)
  },
})`} />

      <SubHeading>createGovernorFromEnv()</SubHeading>
      <Paragraph>
        Initialize from environment variables. Reads GOVERNOR_API_KEY, GOVERNOR_ORG_ID, GOVERNOR_AGENT_ID, etc.
      </Paragraph>
      <CodeBlock copy={copy} copied={copied} label="fromEnv" lang="typescript" code={`import { createGovernorFromEnv } from "@governor/sdk"

const governor = createGovernorFromEnv()`} />

      <SubHeading>governor.wrapTool(options)</SubHeading>
      <Paragraph>
        Wrap a single tool with Governor governance. Returns a governed version of the handler function.
      </Paragraph>
      <CodeBlock copy={copy} copied={copied} label="wrapTool" lang="typescript" code={`const governedRefund = governor.wrapTool({
  tool_name: "stripe",
  tool_action: "refund",
  handler: issueRefund,
  costEstimator: (args) => args.amount * 0.01,
  inputSummarizer: (args) => \`Refund $\${args.amount} for \${args.order_id}\`,
  outputSummarizer: (result) => \`refund_id=\${result.refund_id}\`,
})

const result = await governedRefund({ order_id: "ord_1", amount: 500 })`} />

      <SubHeading>governor.wrapLangChainTool(name, handler)</SubHeading>
      <Paragraph>Returns a LangChain-compatible tool object with name and invoke properties.</Paragraph>
      <CodeBlock copy={copy} copied={copied} label="wrapLangChain" lang="typescript" code={`const dbTool = governor.wrapLangChainTool("postgres_query", queryDatabase)

const result = await dbTool.invoke({ query: "SELECT * FROM users" })`} />

      <SubHeading>governor.evaluate(request)</SubHeading>
      <Paragraph>
        Evaluate a tool call against policies without executing it. Use for custom frameworks or when you want manual control.
      </Paragraph>
      <CodeBlock copy={copy} copied={copied} label="evaluate" lang="typescript" code={`const evaluation = await governor.evaluate({
  org_id: "org_123",
  agent_id: "my-agent",
  tool_name: "stripe",
  tool_action: "refund",
  cost_estimate_usd: 500,
  input_summary: "Refund order #1234",
})

// evaluation.decision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL"
// evaluation.risk_class: "LOW_RISK" | "MONEY_MOVEMENT" | etc.
// evaluation.trace: Array of policy evaluation steps
// evaluation.approval_request_id: string (if approval required)`} />

      <SubHeading>governor.createTelemetryRun(config)</SubHeading>
      <Paragraph>
        Track multi-step pipelines as a single run for visibility and debugging.
      </Paragraph>
      <CodeBlock copy={copy} copied={copied} label="telemetryRun" lang="typescript" code={`const run = governor.createTelemetryRun({
  run_id: "pipeline_123",
  source: "CUSTOM",
  task_name: "daily_export",
  tags: ["scheduled", "etl"],
})

await run.start()
await run.step("fetch_complete", { recordCount: 100 })
await run.step("upload_complete", { destination: "s3://bucket" })
await run.complete({ totalRecords: 100 })
// or: await run.fail(error)`} />

      <SubHeading>Error Types</SubHeading>
      <CodeBlock copy={copy} copied={copied} label="errors" lang="typescript" code={`import {
  GovernorDeniedError,
  GovernorApprovalRequiredError,
} from "@governor/sdk"

try {
  await agent.call("shell.exec", { command: "rm -rf /" })
} catch (err) {
  if (err instanceof GovernorDeniedError) {
    // err.reason - human-readable reason
    // err.risk_class - risk classification
    // err.enforcement_mode - STRICT | PERMISSIVE | AUDIT
  }
  if (err instanceof GovernorApprovalRequiredError) {
    // err.approval_request_id - ID to track approval status
    // err.reason - why approval is needed
  }
}`} />

      <SubHeading>Environment Variables</SubHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
          <thead className="bg-muted/50"><tr>
            <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Variable</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Required</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Default</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Description</th>
          </tr></thead>
          <tbody>
            {[
              ["GOVERNOR_API_KEY", "Yes", "—", "API key for authentication"],
              ["GOVERNOR_ORG_ID", "Yes", "—", "Organization ID"],
              ["GOVERNOR_AGENT_ID", "Yes", "—", "Agent identifier"],
              ["GOVERNOR_API_BASE_URL", "No", "https://api.governor.run", "Governor API endpoint"],
              ["GOVERNOR_ENVIRONMENT", "No", "DEV", "DEV, STAGING, or PROD"],
            ].map(([v, req, def, desc]) => (
              <tr key={v} className="border-t border-border/60">
                <td className="px-4 py-2 font-mono text-xs">{v}</td>
                <td className="px-4 py-2 text-xs">{req}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{def}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── API Reference ──────────────────────────────────────── */

function APISection({ copy, copied }: { copy: (t: string, l: string) => void; copied: string | null }) {
  const endpoints = [
    { method: "POST", path: "/v1/gateway/check", desc: "Evaluate a tool call against policies (primary SDK endpoint)", auth: "API Key" },
    { method: "POST", path: "/v1/gateway/report", desc: "Report tool execution result after a check", auth: "API Key" },
    { method: "POST", path: "/v1/evaluate", desc: "Full policy evaluation with detailed trace", auth: "API Key" },
    { method: "GET", path: "/v1/actions", desc: "List governed actions with filters", auth: "Any" },
    { method: "GET", path: "/v1/actions/:id", desc: "Get action detail with full evaluation trace", auth: "Any" },
    { method: "GET", path: "/v1/actions/stats", desc: "Action statistics (24h/7d/30d)", auth: "Any" },
    { method: "GET", path: "/v1/agents", desc: "List agents for the organization", auth: "Any" },
    { method: "GET", path: "/v1/agents/:id", desc: "Get agent detail with tools and metrics", auth: "Any" },
    { method: "GET", path: "/v1/approvals", desc: "List pending approval requests", auth: "Any" },
    { method: "POST", path: "/v1/approvals/:id/approve", desc: "Approve a pending request", auth: "Any" },
    { method: "POST", path: "/v1/approvals/:id/deny", desc: "Deny a pending request", auth: "Any" },
    { method: "POST", path: "/v1/approvals/:id/escalate", desc: "Escalate a request", auth: "Any" },
    { method: "GET", path: "/v1/policies/v2", desc: "List policy versions", auth: "Any" },
    { method: "POST", path: "/v1/policies/rules", desc: "Create a policy rule", auth: "Any" },
    { method: "POST", path: "/v1/policies/thresholds", desc: "Set risk thresholds", auth: "Any" },
    { method: "POST", path: "/v1/policies/budgets", desc: "Set budget limits", auth: "Any" },
    { method: "POST", path: "/v1/policies/rate-limits", desc: "Set rate limits", auth: "Any" },
    { method: "GET", path: "/v1/api-keys", desc: "List API keys for the organization", auth: "Any" },
    { method: "POST", path: "/v1/api-keys", desc: "Create a new API key", auth: "Any" },
    { method: "DELETE", path: "/v1/api-keys/:id", desc: "Revoke an API key", auth: "Any" },
    { method: "GET", path: "/v1/tools", desc: "List registered tools", auth: "Any" },
    { method: "GET", path: "/v1/metrics/overview", desc: "Dashboard overview metrics", auth: "Any" },
    { method: "GET", path: "/v1/audit-log", desc: "Full audit log with filters", auth: "Any" },
    { method: "GET", path: "/v1/runs", desc: "List telemetry runs", auth: "Any" },
    { method: "POST", path: "/v1/firewall/bootstrap", desc: "Install default AI firewall rules", auth: "Any" },
    { method: "GET", path: "/v1/alerts", desc: "List alert configurations", auth: "Any" },
    { method: "POST", path: "/v1/alerts", desc: "Create an alert rule", auth: "Any" },
    { method: "GET", path: "/v1/billing/usage", desc: "Current billing usage", auth: "Any" },
    { method: "GET", path: "/v1/billing/plans", desc: "Available plans", auth: "Public" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Heading>API Reference</Heading>
        <Paragraph>
          All endpoints are prefixed with /v1 and require authentication via API key (x-governor-key header) or Bearer token.
          Every request must include org_id either as a query parameter, in the request body, or resolved from the API key.
        </Paragraph>
      </div>

      <SubHeading>Authentication</SubHeading>
      <Paragraph>Governor supports two authentication methods:</Paragraph>
      <div className="grid gap-3 sm:grid-cols-2 mt-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Key className="h-4 w-4 text-primary" /><span className="text-sm font-medium">API Key</span><Badge variant="default" className="text-[9px]">Recommended</Badge></div>
            <p className="text-xs text-muted-foreground mb-2">For SDK and server-to-server integrations</p>
            <code className="text-xs font-mono text-foreground">x-governor-key: gov_your_key</code>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Lock className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Bearer Token (Clerk JWT)</span></div>
            <p className="text-xs text-muted-foreground mb-2">For dashboard/browser sessions</p>
            <code className="text-xs font-mono text-foreground">Authorization: Bearer eyJ...</code>
          </CardContent>
        </Card>
      </div>

      <SubHeading>Gateway Check (Primary Endpoint)</SubHeading>
      <CodeBlock copy={copy} copied={copied} label="gateway-check" lang="bash" code={`curl -X POST https://api.governor.run/v1/gateway/check \\
  -H "x-governor-key: gov_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "my-agent",
    "tool_name": "stripe",
    "tool_action": "refund",
    "cost_estimate_usd": 500,
    "input_summary": "Refund order #1234",
    "input": { "order_id": "ord_123", "amount": 500 }
  }'`} />

      <Paragraph>Response:</Paragraph>
      <CodeBlock copy={copy} copied={copied} label="gateway-resp" lang="json" code={`{
  "allowed": false,
  "decision": "REQUIRE_APPROVAL",
  "risk_class": "MONEY_MOVEMENT",
  "reason": "Amount exceeds $200 threshold",
  "approval_request_id": "apr_abc123",
  "trace": [
    { "policy": "firewall_money_movement", "result": "REQUIRE_APPROVAL" }
  ],
  "action_id": "act_xyz789"
}`} />

      <SubHeading>All Endpoints</SubHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
          <thead className="bg-muted/50"><tr>
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Method</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Endpoint</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
          </tr></thead>
          <tbody>
            {endpoints.map((ep) => (
              <tr key={`${ep.method}-${ep.path}`} className="border-t border-border/60">
                <td className="px-3 py-2">
                  <Badge variant={ep.method === "GET" ? "outline" : ep.method === "POST" ? "default" : "destructive"} className="text-[9px] font-mono">
                    {ep.method}
                  </Badge>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{ep.path}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{ep.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Gateway ────────────────────────────────────────────── */

function GatewaySection({ copy, copied }: { copy: (t: string, l: string) => void; copied: string | null }) {
  return (
    <div className="space-y-6">
      <div>
        <Heading>Gateway</Heading>
        <Paragraph>
          The Gateway is Governor's universal tool governance endpoint. It works with any language or framework — just make
          an HTTP call before executing any tool. The SDK uses this under the hood.
        </Paragraph>
      </div>

      <SubHeading>How It Works</SubHeading>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { step: "1", title: "Check", desc: "Before executing a tool, POST to /v1/gateway/check with the tool details." },
          { step: "2", title: "Enforce", desc: "If allowed: true, execute the tool. If false, respect the decision (deny or require approval)." },
          { step: "3", title: "Report", desc: "After execution, POST to /v1/gateway/report with the result for complete audit trail." },
        ].map((s) => (
          <Card key={s.step}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">{s.step}</div>
                <span className="text-sm font-medium">{s.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SubHeading>Python Example</SubHeading>
      <CodeBlock copy={copy} copied={copied} label="gw-python" lang="python" code={`import requests

GOVERNOR_KEY = "gov_your_key"
API = "https://api.governor.run/v1"

def governed_call(tool_name, tool_action, args, cost=0):
    """Check Governor before executing any tool"""
    resp = requests.post(
        f"{API}/gateway/check",
        headers={"x-governor-key": GOVERNOR_KEY},
        json={
            "agent_id": "my-python-agent",
            "tool_name": tool_name,
            "tool_action": tool_action,
            "cost_estimate_usd": cost,
            "input_summary": f"{tool_name}.{tool_action}",
            "input": args,
        },
    )
    result = resp.json()

    if not result.get("allowed"):
        raise Exception(f"Blocked by Governor: {result.get('reason')}")

    # Execute the actual tool...
    output = execute_tool(tool_name, tool_action, args)

    # Report the result
    requests.post(
        f"{API}/gateway/report",
        headers={"x-governor-key": GOVERNOR_KEY},
        json={"action_id": result["action_id"], "output_summary": str(output)},
    )
    return output`} />

      <SubHeading>cURL Example</SubHeading>
      <CodeBlock copy={copy} copied={copied} label="gw-curl" lang="bash" code={`# Check before executing
curl -X POST https://api.governor.run/v1/gateway/check \\
  -H "x-governor-key: gov_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "my-agent",
    "tool_name": "database",
    "tool_action": "delete",
    "input_summary": "Delete user account #1234"
  }'

# Report after executing
curl -X POST https://api.governor.run/v1/gateway/report \\
  -H "x-governor-key: gov_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action_id": "act_xyz789",
    "output_summary": "Deleted 1 row"
  }'`} />
    </div>
  );
}

/* ─── Policies ───────────────────────────────────────────── */

function PoliciesSection() {
  return (
    <div className="space-y-6">
      <div>
        <Heading>Policies</Heading>
        <Paragraph>
          Policies define the rules governing tool usage. Governor supports multiple policy types that are
          evaluated in order for every tool call.
        </Paragraph>
      </div>

      <SubHeading>Policy Types</SubHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: "Rules", desc: "Allow/deny specific tools or tool patterns. Rules are matched by tool_name and tool_action.", icon: FileText, example: "Deny all shell.* tools in PROD" },
          { title: "Thresholds", desc: "Set maximum cost thresholds per tool or risk class. Exceeding a threshold triggers denial or approval.", icon: AlertTriangle, example: "Require approval for actions over $200" },
          { title: "Budgets", desc: "Set spending limits per agent, tool, or organization over a time window.", icon: Zap, example: "Max $1000/day for stripe.* tools" },
          { title: "Rate Limits", desc: "Limit the number of tool calls per time window to prevent runaway agents.", icon: Clock, example: "Max 100 email.send per hour" },
        ].map((p) => (
          <Card key={p.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><p.icon className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{p.title}</span></div>
              <p className="text-xs text-muted-foreground mb-2">{p.desc}</p>
              <div className="rounded bg-muted/50 px-2 py-1"><p className="font-mono text-[10px] text-muted-foreground">{p.example}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SubHeading>Evaluation Order</SubHeading>
      <Card>
        <CardContent className="p-4">
          <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-2">
            <li><span className="text-foreground font-medium">Risk Classification</span> — tool is classified into a risk class (CODE_EXECUTION, MONEY_MOVEMENT, etc.)</li>
            <li><span className="text-foreground font-medium">AI Action Firewall</span> — default deny rules for dangerous risk classes</li>
            <li><span className="text-foreground font-medium">Custom Rules</span> — org-specific allow/deny rules evaluated in priority order</li>
            <li><span className="text-foreground font-medium">Budget Check</span> — checks if the action would exceed any budget limit</li>
            <li><span className="text-foreground font-medium">Rate Limit Check</span> — checks if the action would exceed rate limits</li>
            <li><span className="text-foreground font-medium">Threshold Check</span> — checks cost/risk thresholds</li>
            <li><span className="text-foreground font-medium">Final Decision</span> — ALLOW, DENY, or REQUIRE_APPROVAL with full trace</li>
          </ol>
        </CardContent>
      </Card>

      <SubHeading>Creating Policies via API</SubHeading>
      <Paragraph>
        Use the Policy Studio in the dashboard or the API endpoints:
      </Paragraph>
      <div className="grid gap-2 text-xs">
        {[
          ["POST /v1/policies/rules", "Create allow/deny rules"],
          ["POST /v1/policies/thresholds", "Set cost/risk thresholds"],
          ["POST /v1/policies/budgets", "Set spending budgets"],
          ["POST /v1/policies/rate-limits", "Set rate limits"],
          ["GET /v1/policies/v2", "List all policy versions"],
        ].map(([path, desc]) => (
          <div key={path} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
            <code className="font-mono text-foreground">{path}</code>
            <span className="text-muted-foreground">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Firewall ───────────────────────────────────────────── */

function FirewallSection() {
  const rules = [
    { risk: "CODE_EXECUTION", action: "Deny", color: "text-red-400", bg: "bg-red-500/10", examples: "shell.exec, eval.run, subprocess.call" },
    { risk: "CREDENTIAL_USE", action: "Deny", color: "text-red-400", bg: "bg-red-500/10", examples: "vault.get, secrets.read, keychain.access" },
    { risk: "FILE_MUTATION (delete)", action: "Deny", color: "text-red-400", bg: "bg-red-500/10", examples: "fs.delete, fs.rmdir, file.remove" },
    { risk: "MONEY_MOVEMENT > $200", action: "Require Approval", color: "text-amber-400", bg: "bg-amber-500/10", examples: "stripe.refund, payment.send, invoice.pay" },
    { risk: "DATA_EXPORT", action: "Require Approval", color: "text-amber-400", bg: "bg-amber-500/10", examples: "s3.export, csv.download, report.generate" },
    { risk: "EXTERNAL_COMMUNICATION", action: "Require Approval", color: "text-amber-400", bg: "bg-amber-500/10", examples: "email.send, slack.post, sms.send" },
    { risk: "ADMIN_ACTION", action: "Require Approval", color: "text-amber-400", bg: "bg-amber-500/10", examples: "admin.delete_user, admin.reset, admin.modify" },
    { risk: "PII_ACCESS", action: "Require Approval", color: "text-amber-400", bg: "bg-amber-500/10", examples: "customer.pii, user.ssn, patient.record" },
    { risk: "DATA_WRITE", action: "Allow + Audit", color: "text-emerald-400", bg: "bg-emerald-500/10", examples: "postgres.update, db.insert, cache.set" },
    { risk: "LOW_RISK", action: "Allow + Audit", color: "text-emerald-400", bg: "bg-emerald-500/10", examples: "database.read, search.web, cache.get" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Heading>AI Action Firewall</Heading>
        <Paragraph>
          The AI Action Firewall provides instant protection with zero configuration. It automatically classifies
          every tool call by risk level and applies sensible defaults: blocking dangerous operations, requiring
          human approval for high-risk actions, and allowing low-risk operations with full audit.
        </Paragraph>
      </div>

      <SubHeading>Default Rules</SubHeading>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.risk} className={`rounded-lg border border-border px-4 py-3 ${rule.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-sm font-medium text-foreground">{rule.risk}</span>
              <span className={`text-xs font-semibold ${rule.color}`}>{rule.action}</span>
            </div>
            <p className="text-xs text-muted-foreground">{rule.examples}</p>
          </div>
        ))}
      </div>

      <SubHeading>Installing the Firewall</SubHeading>
      <Paragraph>
        The firewall is installed automatically when you use protectAgent(). For manual installation,
        use the API or the Getting Started page in the dashboard.
      </Paragraph>

      <SubHeading>Customizing Rules</SubHeading>
      <Paragraph>
        Override any default rule by creating a custom policy in Policy Studio. Custom rules take precedence
        over firewall defaults. For example, you can allow email.send for a specific agent while keeping
        it blocked globally.
      </Paragraph>
    </div>
  );
}

/* ─── Approvals ──────────────────────────────────────────── */

function ApprovalsSection() {
  return (
    <div className="space-y-6">
      <div>
        <Heading>Approvals</Heading>
        <Paragraph>
          When a tool call triggers a REQUIRE_APPROVAL decision, Governor creates an approval request and
          blocks execution until a human approves, denies, or escalates it.
        </Paragraph>
      </div>

      <SubHeading>Approval Flow</SubHeading>
      <Card>
        <CardContent className="p-4 font-mono text-xs space-y-1">
          <p>Agent calls tool → Governor evaluates → <span className="text-amber-400">REQUIRE_APPROVAL</span></p>
          <p className="text-muted-foreground">{"  "}↓</p>
          <p>Approval request created → Dashboard shows pending request</p>
          <p className="text-muted-foreground">{"  "}↓</p>
          <p>Reviewer: <span className="text-emerald-400">Approve</span> | <span className="text-red-400">Deny</span> | <span className="text-amber-400">Escalate</span></p>
          <p className="text-muted-foreground">{"  "}↓</p>
          <p>Agent receives result → continues or stops</p>
        </CardContent>
      </Card>

      <SubHeading>Managing Approvals</SubHeading>
      <Paragraph>
        Approvals can be managed through the dashboard Approvals page or via API:
      </Paragraph>
      <div className="grid gap-2 text-xs mt-3">
        {[
          ["GET /v1/approvals", "List pending/completed approvals"],
          ["POST /v1/approvals/:id/approve", "Approve with optional comment"],
          ["POST /v1/approvals/:id/deny", "Deny with reason"],
          ["POST /v1/approvals/:id/escalate", "Escalate to higher authority"],
          ["POST /v1/approvals/:id/comment", "Add a comment without deciding"],
          ["POST /v1/approvals/bulk", "Batch approve/deny multiple requests"],
        ].map(([path, desc]) => (
          <div key={path} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
            <code className="font-mono text-foreground">{path}</code>
            <span className="text-muted-foreground">{desc}</span>
          </div>
        ))}
      </div>

      <SubHeading>Webhook Notifications</SubHeading>
      <Paragraph>
        Configure webhooks to receive real-time notifications when approval requests are created.
        Set up webhooks in Settings → Integrations or via the /v1/webhooks API.
      </Paragraph>
    </div>
  );
}

/* ─── Examples ───────────────────────────────────────────── */

function ExamplesSection({ copy, copied }: { copy: (t: string, l: string) => void; copied: string | null }) {
  const [tab, setTab] = useState("quickstart");

  const examples: Record<string, { label: string; desc: string; code: string }> = {
    quickstart: {
      label: "Quickstart",
      desc: "Protect all agent tools with a single function call",
      code: `import { protectAgent, GovernorDeniedError, GovernorApprovalRequiredError } from "@governor/sdk"

const agent = protectAgent({
  "stripe.refund": async (args) => {
    return { success: true, refund_id: \`re_\${Date.now()}\` }
  },
  "email.send": async (args) => {
    return { sent: true }
  },
  "database.read": async (args) => {
    return { rows: [{ id: 1, name: "Jane" }] }
  },
  "shell.exec": async (args) => {
    return { stdout: "ok", exit_code: 0 }
  },
})

try {
  await agent.call("database.read", { query: "SELECT * FROM users" })
  // → Allowed (LOW_RISK)
} catch (err) {
  if (err instanceof GovernorDeniedError) {
    console.log(\`Denied: \${err.reason} (risk: \${err.risk_class})\`)
  }
  if (err instanceof GovernorApprovalRequiredError) {
    console.log(\`Approval needed: \${err.approval_request_id}\`)
  }
}`,
    },
    openai: {
      label: "OpenAI",
      desc: "Wrap OpenAI function-calling tools with wrapTool",
      code: `import { createGovernorFromEnv, GovernorDeniedError } from "@governor/sdk"

const governor = createGovernorFromEnv()

async function issueRefund(args: { order_id: string; amount: number }) {
  return { success: true, refund_id: \`re_\${Date.now()}\` }
}

const governedRefund = governor.wrapTool({
  tool_name: "stripe",
  tool_action: "refund",
  handler: issueRefund,
  costEstimator: (args) => args.amount * 0.01,
  inputSummarizer: (args) => \`Refund $\${args.amount} for \${args.order_id}\`,
})

try {
  const result = await governedRefund({ order_id: "ord_456", amount: 150 })
  console.log("Refund issued:", result.refund_id)
} catch (err) {
  if (err instanceof GovernorDeniedError) {
    console.log(\`Blocked: \${err.reason}\`)
  }
}`,
    },
    langchain: {
      label: "LangChain",
      desc: "Wrap LangChain tools with wrapLangChainTool",
      code: `import { createGovernorFromEnv } from "@governor/sdk"

const governor = createGovernorFromEnv()

async function queryDatabase(args: { query: string }) {
  return { rows: [{ id: 1, name: "Acme Corp" }], rowCount: 1 }
}

async function exportToS3(args: { bucket: string; key: string; data: string }) {
  return { etag: \`"\${Date.now()}"\`, size: args.data.length }
}

const dbTool = governor.wrapLangChainTool("postgres_query", queryDatabase)
const exportTool = governor.wrapLangChainTool("s3_export", exportToS3)

// Use with LangChain agent
const result = await dbTool.invoke({ query: "SELECT * FROM accounts LIMIT 10" })
// → Allowed (LOW_RISK)

const exported = await exportTool.invoke({
  bucket: "reports",
  key: "export.csv",
  data: "id,name\\n1,Acme Corp"
})
// → May require approval (DATA_EXPORT)`,
    },
    mcp: {
      label: "MCP Server",
      desc: "Govern MCP tool calls with evaluate()",
      code: `import { createGovernorFromEnv, GovernorDeniedError } from "@governor/sdk"

const governor = createGovernorFromEnv()

// Inside your MCP server's tool dispatch handler
async function handleMCPToolCall(toolName: string, args: Record<string, unknown>) {
  const evaluation = await governor.evaluate({
    org_id: process.env.GOVERNOR_ORG_ID!,
    agent_id: process.env.GOVERNOR_AGENT_ID!,
    tool_name: toolName,
    tool_action: "invoke",
    input_summary: JSON.stringify(args).slice(0, 200),
  })

  if (evaluation.decision === "DENY") {
    return { content: [{ type: "text", text: \`Blocked: \${evaluation.reason}\` }] }
  }

  if (evaluation.decision === "REQUIRE_APPROVAL") {
    return {
      content: [{
        type: "text",
        text: \`Approval required (ID: \${evaluation.approval_request_id})\`
      }]
    }
  }

  // Execute the actual MCP tool...
  return executeActualTool(toolName, args)
}`,
    },
    pipeline: {
      label: "Pipeline/ETL",
      desc: "Track multi-step pipelines with telemetry runs",
      code: `import { createGovernor } from "@governor/sdk"

const governor = createGovernor({
  api_base_url: "https://api.governor.run",
  org_id: process.env.GOVERNOR_ORG_ID!,
  agent_id: "data-pipeline",
  api_key: process.env.GOVERNOR_API_KEY!,
  environment: "PROD",
})

const governedFetch = governor.wrapTool({
  tool_name: "internal_db",
  tool_action: "read",
  handler: fetchRecords,
})

const governedUpload = governor.wrapTool({
  tool_name: "internal_etl",
  tool_action: "upload",
  handler: uploadToS3,
  costEstimator: (args) => args.recordCount * 0.001,
})

// Track the pipeline as a single run
const run = governor.createTelemetryRun({
  run_id: \`pipeline_\${Date.now()}\`,
  source: "CUSTOM",
  task_name: "daily_export",
  tags: ["scheduled", "etl"],
})

await run.start()
try {
  const data = await governedFetch({ table: "customers", limit: 1000 })
  await run.step("fetch_complete", { count: data.records.length })

  await governedUpload({ destination: "s3://reports/daily", recordCount: data.records.length })
  await run.complete({ totalRecords: data.records.length })
} catch (err) {
  await run.fail(err as Error)
}`,
    },
    http: {
      label: "HTTP / cURL",
      desc: "Universal gateway — works with any language",
      code: `# 1. Check before executing
curl -X POST https://api.governor.run/v1/gateway/check \\
  -H "x-governor-key: gov_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "my-agent",
    "tool_name": "stripe",
    "tool_action": "refund",
    "cost_estimate_usd": 500,
    "input_summary": "Refund order #1234",
    "input": {"order_id": "ord_123", "amount": 500}
  }'

# Response:
# {
#   "allowed": false,
#   "decision": "REQUIRE_APPROVAL",
#   "risk_class": "MONEY_MOVEMENT",
#   "reason": "Amount exceeds threshold",
#   "action_id": "act_xyz789"
# }

# 2. If allowed, execute the tool, then report
curl -X POST https://api.governor.run/v1/gateway/report \\
  -H "x-governor-key: gov_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action_id": "act_xyz789",
    "output_summary": "Refund issued: re_abc"
  }'`,
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <Heading>Integration Examples</Heading>
        <Paragraph>Complete copy-paste examples for popular frameworks and use cases.</Paragraph>
      </div>

      <div className="flex gap-1 border-b border-border/60 overflow-x-auto">
        {Object.entries(examples).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-3">{examples[tab].desc}</p>
        <CodeBlock copy={copy} copied={copied} label={`ex-${tab}`} lang={tab === "http" ? "bash" : "typescript"} code={examples[tab].code} />
      </div>
    </div>
  );
}

/* ─── Self-Hosting ───────────────────────────────────────── */

function SelfHostSection({ copy, copied }: { copy: (t: string, l: string) => void; copied: string | null }) {
  return (
    <div className="space-y-6">
      <div>
        <Heading>Self-Hosting Guide</Heading>
        <Paragraph>
          Governor can be self-hosted for full control over your data and infrastructure.
          The stack consists of a Next.js console, Fastify API, PostgreSQL, and Redis.
        </Paragraph>
      </div>

      <SubHeading>Prerequisites</SubHeading>
      <div className="grid gap-2">
        {["Node.js 20+", "PostgreSQL 15+", "Redis 7+", "pnpm 9+"].map((req) => (
          <div key={req} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            {req}
          </div>
        ))}
      </div>

      <SubHeading>Quick Setup</SubHeading>
      <CodeBlock copy={copy} copied={copied} label="self-host-setup" lang="bash" code={`# Clone the repository
git clone https://github.com/your-org/governor.git
cd governor

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env with your database and Redis URLs
# DATABASE_URL=postgresql://user:pass@localhost:5432/governor
# REDIS_URL=redis://localhost:6379

# Run database migrations
cd apps/api && npx prisma migrate deploy && cd ../..

# Start in development mode
make dev

# Console: http://localhost:3000
# API:     http://localhost:4000`} />

      <SubHeading>Environment Variables</SubHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
          <thead className="bg-muted/50"><tr>
            <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Variable</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Required</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Description</th>
          </tr></thead>
          <tbody>
            {[
              ["DATABASE_URL", "Yes", "PostgreSQL connection string"],
              ["REDIS_URL", "No", "Redis connection string (optional — uses in-memory fallback)"],
              ["NEXT_PUBLIC_API_BASE_URL", "No", "API URL for console (production: https://api.governor.run)"],
              ["CORS_ORIGIN", "No", "CORS allowed origins (default: *)"],
              ["NODE_ENV", "No", "production or development"],
              ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "No", "Clerk auth (optional)"],
              ["CLERK_SECRET_KEY", "No", "Clerk auth server secret"],
              ["GOVERNOR_ORG_ID", "No", "Default org for local dev (when Clerk is disabled)"],
            ].map(([v, req, desc]) => (
              <tr key={v} className="border-t border-border/60">
                <td className="px-4 py-2 font-mono text-xs">{v}</td>
                <td className="px-4 py-2 text-xs">{req}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SubHeading>Production Deployment</SubHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { name: "Console (Next.js)", target: "Vercel", notes: "Set NEXT_PUBLIC_API_BASE_URL to your API domain" },
          { name: "API (Fastify)", target: "Fly.io / Render / Railway", notes: "Set DATABASE_URL, REDIS_URL, CORS_ORIGIN" },
          { name: "Database", target: "Neon / Supabase / RDS", notes: "Run prisma migrate deploy before first start" },
          { name: "Redis", target: "Upstash / ElastiCache", notes: "Used for caching, pub/sub, and rate limiting" },
        ].map((item) => (
          <Card key={item.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{item.name}</span>
                <Badge variant="outline" className="text-[9px]">{item.target}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{item.notes}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SubHeading>Docker (Coming Soon)</SubHeading>
      <Paragraph>
        A docker-compose setup for one-command local deployment is in development. It will include
        the API, console, PostgreSQL, and Redis pre-configured.
      </Paragraph>
    </div>
  );
}
