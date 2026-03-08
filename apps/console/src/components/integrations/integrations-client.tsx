"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Key, Plus, Trash2, Copy, Loader2, ShieldCheck,
  CheckCircle, Eye, EyeOff, Plug
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  framework?: string | null;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
}

interface FrameworkStats {
  framework: string;
  agents: number;
  active_agents: number;
  tool_calls: number;
  runs: number;
  cost_usd: number;
  denied: number;
  allowed: number;
  approval_required: number;
  block_rate: number;
  api_keys: number;
}

interface IntegrationsClientProps {
  orgId: string;
  apiBaseUrl: string;
  initialKeys: ApiKey[];
  frameworks: FrameworkStats[];
}

const PLATFORM_CATEGORIES = [
  {
    category: "No-Code Platforms",
    platforms: [
      { id: "zapier", name: "Zapier Central", desc: "Automate across 8,000+ apps" },
      { id: "mindstudio", name: "MindStudio", desc: "Visual-first agent builder" },
      { id: "lindy", name: "Lindy", desc: "Digital employees for support & sales" },
      { id: "agentgpt", name: "AgentGPT", desc: "Browser-based autonomous agents" },
      { id: "relevance_ai", name: "Relevance AI", desc: "AI agent teams for workflows" }
    ]
  },
  {
    category: "Enterprise Platforms",
    platforms: [
      { id: "copilot_studio", name: "Microsoft Copilot Studio", desc: "M365 agent integration" },
      { id: "vertex_ai", name: "Google Vertex AI", desc: "Enterprise agent building" },
      { id: "agentforce", name: "Salesforce Agentforce", desc: "CRM agent automation" },
      { id: "watsonx", name: "IBM watsonx.ai", desc: "Enterprise AI deployment" }
    ]
  },
  {
    category: "Developer Frameworks",
    platforms: [
      { id: "langchain", name: "LangChain / LangGraph", desc: "Python/TS agent framework" },
      { id: "crewai", name: "CrewAI", desc: "Multi-agent collaboration" },
      { id: "autogen", name: "Microsoft AutoGen", desc: "Multi-agent conversations" },
      { id: "pydantic_ai", name: "PydanticAI", desc: "Model-agnostic Python agents" }
    ]
  },
  {
    category: "Workflow Automation",
    platforms: [
      { id: "n8n", name: "n8n", desc: "Open-source workflow automation" },
      { id: "make", name: "Make.com", desc: "Visual automation canvas" }
    ]
  }
];

export function IntegrationsClient({ orgId, apiBaseUrl, initialKeys, frameworks }: IntegrationsClientProps) {
  const [keys, setKeys] = useState(initialKeys);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyFramework, setNewKeyFramework] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ text: string; variant: "success" | "error" } | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function showToast(text: string, variant: "success" | "error" = "success") {
    setToast({ text, variant });
    setTimeout(() => setToast(null), 3000);
  }

  function handleCreateKey() {
    if (!newKeyName.trim()) {
      showToast("Key name is required", "error");
      return;
    }

    startTransition(async () => {
      const response = await apiFetch(`/v1/api-keys`, {
        method: "POST",
        body: JSON.stringify({
          org_id: orgId,
          name: newKeyName.trim(),
          framework: newKeyFramework || undefined
        })
      });

      if (!response.ok) {
        showToast("Failed to create API key", "error");
        return;
      }

      const data = await response.json();
      setCreatedKey(data.key);
      setKeys(prev => [{
        id: data.id,
        name: data.name,
        keyPrefix: data.key_prefix,
        framework: data.framework,
        lastUsedAt: null,
        expiresAt: data.expires_at,
        revokedAt: null,
        createdAt: data.created_at
      }, ...prev]);
      setNewKeyName("");
      setNewKeyFramework("");
      showToast("API key created — copy it now, it won't be shown again");
    });
  }

  function handleRevoke(keyId: string) {
    startTransition(async () => {
      const response = await apiFetch(`/v1/api-keys/${keyId}`, { method: "DELETE" });
      if (response.ok) {
        setKeys(prev => prev.map(k => k.id === keyId ? { ...k, revokedAt: new Date().toISOString() } : k));
        showToast("Key revoked");
      }
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeKeys = keys.filter(k => !k.revokedAt);
  const gatewayUrl = `${apiBaseUrl}/v1/gateway`;
  const totalToolCalls = frameworks.reduce((sum, f) => sum + f.tool_calls, 0);
  const totalCost = frameworks.reduce((sum, f) => sum + f.cost_usd, 0);
  const connectedPlatforms = frameworks.filter(f => f.framework !== "unknown" && f.agents > 0).length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed right-6 top-6 z-50 animate-in fade-in slide-in-from-top-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
          toast.variant === "error"
            ? "border-red-500/30 bg-red-950/80 text-red-300"
            : "border-emerald-500/30 bg-emerald-950/80 text-emerald-300"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Connected Platforms</p>
            <p className="mt-1 text-2xl font-bold text-primary">{connectedPlatforms}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active API Keys</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{activeKeys.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Governed Actions (7d)</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{totalToolCalls.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Governed Cost (7d)</p>
            <p className="mt-1 text-2xl font-bold text-foreground">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Framework Analytics */}
      {frameworks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Platform Activity</CardTitle>
            <CardDescription>Governance decisions and costs by agent platform — last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Agents</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Actions Governed</TableHead>
                  <TableHead>Allowed</TableHead>
                  <TableHead>Denied</TableHead>
                  <TableHead>Block Rate</TableHead>
                  <TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {frameworks.map((fw) => (
                  <TableRow key={fw.framework}>
                    <TableCell>
                      <span className="font-medium capitalize text-foreground">{fw.framework === "unknown" ? "Direct / SDK" : fw.framework}</span>
                    </TableCell>
                    <TableCell>{fw.active_agents}/{fw.agents}</TableCell>
                    <TableCell>{fw.runs}</TableCell>
                    <TableCell className="font-mono">{fw.tool_calls}</TableCell>
                    <TableCell className="text-emerald-400">{fw.allowed}</TableCell>
                    <TableCell className="text-red-400">{fw.denied}</TableCell>
                    <TableCell>
                      <Badge variant={fw.block_rate > 10 ? "destructive" : fw.block_rate > 0 ? "warning" : "success"}>
                        {fw.block_rate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">${fw.cost_usd.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                <CardTitle>API Keys</CardTitle>
              </div>
              <CardDescription>Create keys for each platform integration. Each key auto-resolves your organization.</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setShowCreate(!showCreate); setCreatedKey(null); }}>
              <Plus className="mr-2 h-4 w-4" /> New Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreate && (
            <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-5">
              <h4 className="mb-3 text-sm font-semibold">Create API Key</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Key Name *</Label>
                  <Input
                    placeholder="e.g., Zapier Production"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Platform</Label>
                  <select
                    value={newKeyFramework}
                    onChange={(e) => setNewKeyFramework(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground"
                  >
                    <option value="">Select platform...</option>
                    {PLATFORM_CATEGORIES.flatMap(c => c.platforms).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    <option value="custom">Custom / Other</option>
                  </select>
                </div>
              </div>
              <Button onClick={handleCreateKey} disabled={isPending} size="sm" className="mt-4">
                {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Key"}
              </Button>

              {createdKey && (
                <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/30 p-4">
                  <p className="mb-2 text-sm font-medium text-amber-300">Your API key (copy now — shown only once):</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-black/50 px-3 py-2 font-mono text-sm text-foreground">
                      {showKey ? createdKey : `${createdKey.slice(0, 12)}${"•".repeat(32)}`}
                    </code>
                    <Button size="sm" variant="ghost" onClick={() => setShowKey(!showKey)}>
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(createdKey)}>
                      {copied ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {keys.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No API keys yet. Create one to start integrating platforms.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id} className={key.revokedAt ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{key.keyPrefix}•••</TableCell>
                    <TableCell>
                      {key.framework ? (
                        <Badge variant="outline" className="capitalize">{key.framework}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
                    </TableCell>
                    <TableCell>
                      {key.revokedAt ? (
                        <Badge variant="destructive">Revoked</Badge>
                      ) : key.expiresAt && new Date(key.expiresAt) < new Date() ? (
                        <Badge variant="warning">Expired</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!key.revokedAt && (
                        <Button size="sm" variant="ghost" onClick={() => handleRevoke(key.id)} disabled={isPending}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Gateway Endpoint Reference */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <CardTitle>Gateway Endpoint</CardTitle>
          </div>
          <CardDescription>
            The universal governance checkpoint. Every agent — regardless of platform — calls this before performing an action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <code className="text-sm font-semibold text-primary">POST {gatewayUrl}/check</code>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`${gatewayUrl}/check`)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Returns <code className="text-emerald-400">{`{ "allowed": true }`}</code> or <code className="text-red-400">{`{ "allowed": false }`}</code> — branch your workflow on this value.
              </p>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-black/60 p-4 text-xs text-muted-foreground">{`curl -X POST ${gatewayUrl}/check \\
  -H "x-governor-key: gov_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "my_agent",
    "tool_name": "stripe",
    "tool_action": "refund",
    "cost_estimate_usd": 49.99
  }'`}</pre>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <code className="text-sm text-primary">POST {gatewayUrl}/check</code>
                <p className="mt-1 text-xs text-muted-foreground">Pre-action governance check</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <code className="text-sm text-primary">POST {gatewayUrl}/report</code>
                <p className="mt-1 text-xs text-muted-foreground">Report action outcome</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <code className="text-sm text-primary">GET {gatewayUrl}/health</code>
                <p className="mt-1 text-xs text-muted-foreground">Verify connectivity and key</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Setup Guides */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-primary" />
            <CardTitle>Platform Setup Guides</CardTitle>
          </div>
          <CardDescription>Click a platform for integration instructions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {PLATFORM_CATEGORIES.map((cat) => (
              <div key={cat.category}>
                <h4 className="mb-3 text-sm font-semibold text-foreground">{cat.category}</h4>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.platforms.map((p) => {
                    const stats = frameworks.find(f => f.framework === p.id);
                    const isSelected = selectedPlatform === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPlatform(isSelected ? null : p.id)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          isSelected ? "border-primary/50 bg-primary/5" : "border-border bg-muted/30 hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{p.name}</span>
                          {stats && stats.agents > 0 && (
                            <Badge variant="success" className="text-[9px]">Connected</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{p.desc}</p>
                        {stats && stats.agents > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {stats.agents} agents · {stats.tool_calls} actions
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {cat.platforms.some(p => p.id === selectedPlatform) && (
                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <PlatformGuide platform={selectedPlatform!} gatewayUrl={gatewayUrl} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlatformGuide({ platform, gatewayUrl }: { platform: string; gatewayUrl: string }) {
  const guides: Record<string, { title: string; steps: string[] }> = {
    zapier: {
      title: "Zapier Central Integration",
      steps: [
        `Create an API key above with platform "zapier".`,
        `In your Zap, add a "Webhooks by Zapier" action before any tool step.`,
        `Set method to POST and URL to: ${gatewayUrl}/check`,
        `Add header: x-governor-key = your API key.`,
        `Set body to JSON: { "agent_id": "zapier_bot", "tool_name": "your_tool", "tool_action": "your_action", "cost_estimate_usd": 0 }`,
        `Add a Filter step: continue only if "allowed" equals "true".`,
        `After the action, optionally POST to ${gatewayUrl}/report to log the outcome.`
      ]
    },
    n8n: {
      title: "n8n Integration",
      steps: [
        `Create an API key above with platform "n8n".`,
        `In your n8n workflow, add an HTTP Request node before any tool node.`,
        `Method: POST, URL: ${gatewayUrl}/check`,
        `Headers: x-governor-key = your API key, Content-Type = application/json`,
        `Body: { "agent_id": "n8n_workflow_name", "tool_name": "...", "tool_action": "...", "cost_estimate_usd": 0 }`,
        `Add an IF node after: check if {{ $json.allowed }} is true.`,
        `Route "true" to your action, "false" to an error handler or notification.`
      ]
    },
    make: {
      title: "Make.com Integration",
      steps: [
        `Create an API key above with platform "make".`,
        `In your scenario, add an HTTP "Make a request" module before tool modules.`,
        `URL: ${gatewayUrl}/check, Method: POST`,
        `Headers: x-governor-key = your key`,
        `Body type: Raw, Content-Type: JSON`,
        `Body: { "agent_id": "make_scenario_name", "tool_name": "...", "tool_action": "..." }`,
        `Add a Router after: one route for "allowed = true", another for blocked.`
      ]
    },
    langchain: {
      title: "LangChain / LangGraph Integration",
      steps: [
        `Install the Governor SDK: pip install governor-sdk (or use the REST API).`,
        `Use the wrapTool() helper to automatically gate tool calls through Governor.`,
        `Or make direct HTTP calls: POST ${gatewayUrl}/check before each tool invocation.`,
        `In LangGraph, add a Governor check node before action nodes in your state graph.`,
        `The SDK handles retries, approval polling, and telemetry automatically.`
      ]
    },
    crewai: {
      title: "CrewAI Integration",
      steps: [
        `Before each agent's tool execution, call: POST ${gatewayUrl}/check`,
        `Pass the crew agent's role as agent_id and the tool name/action.`,
        `In your CrewAI tool decorator, wrap the execution with a Governor check.`,
        `If Governor returns { "allowed": false }, raise an exception or skip the tool.`,
        `Report outcomes via POST ${gatewayUrl}/report after tool completion.`
      ]
    },
    autogen: {
      title: "Microsoft AutoGen Integration",
      steps: [
        `In your AutoGen agent's function_map, wrap each function with a Governor check.`,
        `Before executing the function, POST to ${gatewayUrl}/check.`,
        `Include the agent name, function name, and estimated cost.`,
        `If denied, return a message to the conversation explaining the policy decision.`,
        `Report outcomes back via POST ${gatewayUrl}/report.`
      ]
    },
    pydantic_ai: {
      title: "PydanticAI Integration",
      steps: [
        `In your PydanticAI agent's tool functions, add a Governor pre-check.`,
        `Call POST ${gatewayUrl}/check before executing the tool logic.`,
        `If not allowed, raise a ModelRetry or return a policy denial message.`,
        `Use the structured response to inform the agent about policy constraints.`
      ]
    },
    copilot_studio: {
      title: "Microsoft Copilot Studio Integration",
      steps: [
        `Create an API key with platform "copilot_studio".`,
        `In Power Automate (called from Copilot), add an HTTP action before tool steps.`,
        `POST to ${gatewayUrl}/check with your API key in the x-governor-key header.`,
        `Parse the JSON response and add a condition: allowed = true.`,
        `If false, send a message back to the user explaining the policy decision.`
      ]
    },
    vertex_ai: {
      title: "Google Vertex AI Agent Builder",
      steps: [
        `Create an API key with platform "vertex_ai".`,
        `In your Vertex AI agent's tool handlers, add a pre-execution webhook.`,
        `Call POST ${gatewayUrl}/check with agent_id and tool details.`,
        `Use the response to gate tool execution within your agent's logic.`
      ]
    },
    agentforce: {
      title: "Salesforce Agentforce Integration",
      steps: [
        `Create an API key with platform "agentforce".`,
        `In Agentforce action configuration, add a pre-execution Apex callout.`,
        `Call POST ${gatewayUrl}/check from Apex/Flow before each agent action.`,
        `Branch on the "allowed" field to continue or block the action.`
      ]
    },
    watsonx: {
      title: "IBM watsonx.ai Integration",
      steps: [
        `Create an API key with platform "watsonx".`,
        `In your watsonx agent pipeline, add an HTTP step before tool execution.`,
        `POST to ${gatewayUrl}/check with agent details.`,
        `Use the decision result to gate downstream tool calls.`
      ]
    },
    mindstudio: {
      title: "MindStudio Integration",
      steps: [
        `Create an API key with platform "mindstudio".`,
        `In your MindStudio workflow, add an API call block before tool blocks.`,
        `Configure POST ${gatewayUrl}/check with your key in headers.`,
        `Use the "allowed" response to conditionally execute the tool.`
      ]
    },
    lindy: {
      title: "Lindy Integration",
      steps: [
        `Create an API key with platform "lindy".`,
        `In your Lindy automation, add a webhook step before action steps.`,
        `POST to ${gatewayUrl}/check with agent and tool details.`,
        `Branch on the response to allow or block the action.`
      ]
    },
    agentgpt: {
      title: "AgentGPT Integration",
      steps: [
        `Create an API key with platform "agentgpt".`,
        `Fork the AgentGPT repo and add a Governor check in the tool execution pipeline.`,
        `Before each tool call, POST to ${gatewayUrl}/check.`,
        `If denied, add the policy reason to the agent's context as a constraint.`
      ]
    },
    relevance_ai: {
      title: "Relevance AI Integration",
      steps: [
        `Create an API key with platform "relevance_ai".`,
        `In your Relevance AI tool chain, add an API step before tool execution.`,
        `POST to ${gatewayUrl}/check with agent and tool details.`,
        `Use conditional logic to proceed only if allowed.`
      ]
    }
  };

  const guide = guides[platform];
  if (!guide) return <p className="text-sm text-muted-foreground">Setup guide coming soon.</p>;

  return (
    <div>
      <h5 className="mb-3 text-sm font-semibold text-foreground">{guide.title}</h5>
      <ol className="space-y-2">
        {guide.steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">{i + 1}</span>
            <span className="text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
