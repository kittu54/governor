"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import {
  ShieldCheck, Key, Zap, CheckCircle, Circle, Copy, Eye, EyeOff,
  Rocket, ArrowRight, Terminal, Code, BookOpen, ExternalLink, Loader2,
} from "lucide-react";

interface QuickstartProps {
  orgId: string;
  hasApiKey: boolean;
  firewallInstalled: boolean;
  agentCount: number;
  actionCount: number;
}

export function QuickstartClient({ orgId, hasApiKey, firewallInstalled, agentCount, actionCount }: QuickstartProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("my-agent");
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; variant: "success" | "error" } | null>(null);
  const [keyCreated, setKeyCreated] = useState(hasApiKey);

  function showToast(text: string, variant: "success" | "error" = "success") {
    setToast({ text, variant });
    setTimeout(() => setToast(null), 3000);
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function generateKey() {
    if (!keyName.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/v1/api-keys`, {
        method: "POST",
        body: JSON.stringify({ org_id: orgId, name: keyName }),
      });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.key);
        setKeyCreated(true);
        setShowKey(true);
        showToast("API key created! Save it securely.");
      } else {
        const err = await res.json().catch(() => null);
        showToast((err as any)?.error ?? "Failed to create key", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setLoading(false);
    }
  }

  async function installFirewall() {
    setLoading(true);
    try {
      const res = await apiFetch(`/v1/firewall/bootstrap`, {
        method: "POST",
        body: JSON.stringify({ org_id: orgId }),
      });
      if (res.ok) {
        showToast("AI Action Firewall installed!");
      }
    } catch {
      showToast("Failed to install firewall", "error");
    } finally {
      setLoading(false);
    }
  }

  const displayKey = apiKey ?? "sk_gov_•••••••••••••••••••••••••••";
  const sdkKey = apiKey ?? "YOUR_API_KEY";

  const steps = [
    { id: "key", label: "Generate API Key", done: keyCreated },
    { id: "install", label: "Install SDK", done: false },
    { id: "protect", label: "Protect Your Agent", done: agentCount > 0 },
    { id: "actions", label: "See Actions", done: actionCount > 0 },
  ];

  const completedSteps = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed right-6 top-6 z-50 animate-in fade-in slide-in-from-top-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
          toast.variant === "error" ? "border-red-500/30 bg-red-950/80 text-red-300" : "border-emerald-500/30 bg-emerald-950/80 text-emerald-300"
        }`}>
          {toast.text}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          Getting Started
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Protect your AI agents in under 5 minutes. No policy configuration required.
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-muted-foreground">Setup Progress</div>
            <div className="flex-1 h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${(completedSteps / steps.length) * 100}%` }}
              />
            </div>
            <div className="text-sm font-medium">{completedSteps}/{steps.length}</div>
          </div>
          <div className="flex gap-6 mt-3">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-1.5 text-xs">
                {step.done
                  ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className={step.done ? "text-emerald-400" : "text-muted-foreground"}>{step.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Step 1: API Key */}
        <Card className={keyCreated ? "border-emerald-500/30" : "border-primary/30"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${keyCreated ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/20 text-primary"}`}>1</div>
              <Key className="h-4 w-4" />
              Generate API Key
              {keyCreated && <Badge variant="success" className="ml-auto text-[9px]">Done</Badge>}
            </CardTitle>
            <CardDescription>Your SDK uses this key to authenticate with Governor</CardDescription>
          </CardHeader>
          <CardContent>
            {!keyCreated ? (
              <div className="space-y-3">
                <Input
                  placeholder="Key name (e.g. my-agent)"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                />
                <Button onClick={generateKey} disabled={loading || !keyName.trim()} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                  Generate API Key
                </Button>
              </div>
            ) : apiKey ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 font-mono text-xs">
                  <code className="flex-1 break-all">{showKey ? apiKey : "gov_•••••••••••••••••••••••"}</code>
                  <button onClick={() => setShowKey(!showKey)} className="text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => copyToClipboard(apiKey, "key")} className="text-muted-foreground hover:text-foreground">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {copied === "key" && <span className="text-[10px] text-emerald-400">Copied!</span>}
                </div>
                <p className="text-[11px] text-amber-400">Save this key now. It won&apos;t be shown again.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">API key already created. Go to Settings to manage keys.</p>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Install SDK */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">2</div>
              <Terminal className="h-4 w-4" />
              Install SDK
            </CardTitle>
            <CardDescription>Add the Governor SDK to your project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">npm</span>
                  <button onClick={() => copyToClipboard("npm install @governor/sdk", "npm")} className="text-muted-foreground hover:text-foreground">
                    {copied === "npm" ? <span className="text-[10px] text-emerald-400">Copied!</span> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <code className="font-mono text-sm text-foreground">npm install @governor/sdk</code>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Environment</span>
                  <button onClick={() => copyToClipboard(`GOVERNOR_API_KEY=${sdkKey}\nGOVERNOR_ORG_ID=${orgId}\nGOVERNOR_AGENT_ID=my-agent`, "env")} className="text-muted-foreground hover:text-foreground">
                    {copied === "env" ? <span className="text-[10px] text-emerald-400">Copied!</span> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <pre className="font-mono text-xs text-foreground whitespace-pre">{`GOVERNOR_API_KEY=${sdkKey}\nGOVERNOR_ORG_ID=${orgId}\nGOVERNOR_AGENT_ID=my-agent`}</pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 3: Protect Your Agent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">3</div>
            <ShieldCheck className="h-4 w-4" />
            Protect Your Agent
            {agentCount > 0 && <Badge variant="success" className="ml-auto text-[9px]">Connected</Badge>}
          </CardTitle>
          <CardDescription>Add one function call to protect all your agent&apos;s tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Option A: protectAgent */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="text-[9px]">Recommended</Badge>
                <span className="text-xs font-medium text-muted-foreground">Zero-config protection</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 relative">
                <button
                  onClick={() => copyToClipboard(`import { protectAgent } from "@governor/sdk"

const agent = protectAgent({
  "stripe.refund": issueRefund,
  "email.send": sendEmail,
  "database.query": queryDB,
})

// Every call is now governed
await agent.call("stripe.refund", { amount: 500 })`, "protect")}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {copied === "protect" ? <span className="text-[10px] text-emerald-400">Copied!</span> : <Copy className="h-3 w-3" />}
                </button>
                <pre className="font-mono text-xs text-foreground overflow-x-auto">{`import { protectAgent } from "@governor/sdk"

const agent = protectAgent({
  "stripe.refund": issueRefund,
  "email.send": sendEmail,
  "database.query": queryDB,
})

// Every call is now governed
await agent.call("stripe.refund", { amount: 500 })`}</pre>
              </div>
            </div>

            {/* Option B: wrapTool */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[9px]">Advanced</Badge>
                <span className="text-xs font-medium text-muted-foreground">Manual tool wrapping</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 relative">
                <button
                  onClick={() => copyToClipboard(`import { createGovernor } from "@governor/sdk"

const gov = createGovernor({
  api_base_url: "${API_BASE_URL}",
  api_key: "${sdkKey}",
  org_id: "${orgId}",
  agent_id: "my-agent",
})

const refund = gov.wrapTool({
  tool_name: "stripe",
  tool_action: "refund",
  handler: issueRefund,
})`, "wrap")}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {copied === "wrap" ? <span className="text-[10px] text-emerald-400">Copied!</span> : <Copy className="h-3 w-3" />}
                </button>
                <pre className="font-mono text-xs text-foreground overflow-x-auto">{`import { createGovernor } from "@governor/sdk"

const gov = createGovernor({
  api_base_url: "https://api.governor.run",
  api_key: "${sdkKey}",
  org_id: "${orgId}",
  agent_id: "my-agent",
})

const refund = gov.wrapTool({
  tool_name: "stripe",
  tool_action: "refund",
  handler: issueRefund,
})`}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: See Actions */}
      <Card className={actionCount > 0 ? "border-emerald-500/30" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${actionCount > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/20 text-primary"}`}>4</div>
            <Zap className="h-4 w-4" />
            See Actions in Dashboard
            {actionCount > 0 && <Badge variant="success" className="ml-auto text-[9px]">{actionCount} actions</Badge>}
          </CardTitle>
          <CardDescription>
            {actionCount > 0
              ? "Your agents are being governed. View all actions in the Action Explorer."
              : "Once your agent makes its first tool call, actions will appear here automatically."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={"/actions" as Route}>
            <Button variant={actionCount > 0 ? "default" : "outline"}>
              <Zap className="h-4 w-4 mr-2" />
              Open Action Explorer
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Default Firewall Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            AI Action Firewall — Default Rules
            {firewallInstalled
              ? <Badge variant="success" className="ml-2 text-[9px]">Active</Badge>
              : <Button size="sm" variant="outline" className="ml-auto" onClick={installFirewall} disabled={loading}>Install</Button>}
          </CardTitle>
          <CardDescription>These rules are active automatically. No configuration needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { risk: "CODE_EXECUTION", action: "Deny", color: "text-red-400", example: "shell.exec, eval.run" },
              { risk: "CREDENTIAL_USE", action: "Deny", color: "text-red-400", example: "vault.get, secrets.read" },
              { risk: "FILE_MUTATION", action: "Deny (delete)", color: "text-red-400", example: "fs.delete" },
              { risk: "MONEY_MOVEMENT", action: "Approval > $200", color: "text-amber-400", example: "stripe.refund" },
              { risk: "DATA_EXPORT", action: "Approval Required", color: "text-amber-400", example: "s3.export" },
              { risk: "EXTERNAL_COMM", action: "Approval Required", color: "text-amber-400", example: "email.send" },
              { risk: "ADMIN_ACTION", action: "Approval Required", color: "text-amber-400", example: "admin.delete" },
              { risk: "PII_ACCESS", action: "Approval Required", color: "text-amber-400", example: "customer.pii" },
              { risk: "DATA_WRITE", action: "Allow + Audit", color: "text-emerald-400", example: "postgres.update" },
              { risk: "LOW_RISK", action: "Allow + Audit", color: "text-emerald-400", example: "database.read" },
            ].map((rule) => (
              <div key={rule.risk} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-medium">{rule.risk}</span>
                  <span className={`text-[10px] font-medium ${rule.color}`}>{rule.action}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{rule.example}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Framework Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code className="h-4 w-4 text-primary" />
            Integration Examples
          </CardTitle>
          <CardDescription>Copy-paste examples for popular frameworks</CardDescription>
        </CardHeader>
        <CardContent>
          <ExampleTabs sdkKey={sdkKey} orgId={orgId} copied={copied} onCopy={copyToClipboard} />
        </CardContent>
      </Card>

      {/* Links */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href={"/policy-studio" as Route}>
          <Card className="h-full hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Code className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Policy Studio</p>
                <p className="text-[11px] text-muted-foreground">Create custom governance policies</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={"/approvals" as Route}>
          <Card className="h-full hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Approvals</p>
                <p className="text-[11px] text-muted-foreground">Review pending approval requests</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={"/settings" as Route}>
          <Card className="h-full hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Settings</p>
                <p className="text-[11px] text-muted-foreground">Manage API keys and organization</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function ExampleTabs({ sdkKey, orgId, copied, onCopy }: {
  sdkKey: string;
  orgId: string;
  copied: string | null;
  onCopy: (text: string, label: string) => void;
}) {
  const [tab, setTab] = useState("openai");

  const examples: Record<string, { label: string; code: string }> = {
    openai: {
      label: "OpenAI",
      code: `import OpenAI from "openai"
import { protectAgent } from "@governor/sdk"

const openai = new OpenAI()

const tools = protectAgent({
  "search.web": async (args) => {
    return { results: ["result1", "result2"] }
  },
  "email.send": async (args) => {
    return { sent: true, to: args.to }
  },
})

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Search for AI governance" }],
  tools: tools.toOpenAI(),
})`,
    },
    langchain: {
      label: "LangChain",
      code: `import { ChatOpenAI } from "@langchain/openai"
import { protectAgent } from "@governor/sdk"

const tools = protectAgent({
  "calculator.compute": async ({ expression }) => {
    return eval(expression)
  },
  "weather.get": async ({ city }) => {
    return { temp: 72, city }
  },
})

const model = new ChatOpenAI({ model: "gpt-4o" })
const modelWithTools = model.bindTools(tools.toLangChain())`,
    },
    gateway: {
      label: "HTTP Gateway",
      code: `# Universal gateway — works with any language or platform
# Just make an HTTP call before executing any tool

curl -X POST https://api.governor.run/v1/gateway/check \\
  -H "x-governor-key: ${sdkKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "my-agent",
    "tool_name": "stripe",
    "tool_action": "refund",
    "cost_estimate_usd": 500,
    "input_summary": "Refund order #1234"
  }'

# Response: { "allowed": true/false, "decision": "ALLOW" }`,
    },
    python: {
      label: "Python",
      code: `import requests

GOVERNOR_KEY = "${sdkKey}"
API = "https://api.governor.run/v1"

def governed_tool_call(tool_name, tool_action, cost=0, summary=""):
    """Check Governor before executing any tool"""
    resp = requests.post(f"{API}/gateway/check", 
        headers={"x-governor-key": GOVERNOR_KEY},
        json={
            "agent_id": "my-python-agent",
            "tool_name": tool_name,
            "tool_action": tool_action,
            "cost_estimate_usd": cost,
            "input_summary": summary,
        })
    result = resp.json()
    if not result.get("allowed"):
        raise Exception(f"Blocked: {result.get('message')}")
    return result

# Use before any tool call
governed_tool_call("stripe", "refund", cost=500)
issue_refund(500)  # only runs if Governor allows it`,
    },
    mcp: {
      label: "MCP Server",
      code: `import { createGovernor } from "@governor/sdk"

const governor = createGovernor({
  api_key: "${sdkKey}",
  org_id: "${orgId}",
  agent_id: "mcp-server",
})

// Wrap each MCP tool with Governor governance
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const result = await governor.evaluate({
    tool_name: request.params.name,
    tool_action: "execute",
    input: request.params.arguments,
  })

  if (result.decision !== "ALLOW") {
    return { content: [{ type: "text", text: "Blocked by policy" }] }
  }

  // Execute the actual tool...
})`,
    },
  };

  return (
    <div>
      <div className="flex gap-1 border-b border-border/60 mb-4">
        {Object.entries(examples).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-muted/50 p-4 relative">
        <button
          onClick={() => onCopy(examples[tab].code, `ex-${tab}`)}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        >
          {copied === `ex-${tab}` ? <span className="text-[10px] text-emerald-400">Copied!</span> : <Copy className="h-3 w-3" />}
        </button>
        <pre className="font-mono text-xs text-foreground overflow-x-auto whitespace-pre">{examples[tab].code}</pre>
      </div>
    </div>
  );
}
