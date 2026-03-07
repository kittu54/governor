"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Scale, Trash2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface PolicyRule {
  id: string;
  orgId: string;
  agentId?: string | null;
  toolName: string;
  toolAction: string;
  effect: "ALLOW" | "DENY";
  priority: number;
  reason?: string | null;
}

interface Threshold {
  id: string;
  orgId: string;
  agentId?: string | null;
  toolName: string;
  toolAction: string;
  amountUsd: number;
}

interface Budget {
  id: string;
  orgId: string;
  agentId?: string | null;
  dailyLimitUsd: number;
}

interface RateLimit {
  id: string;
  orgId: string;
  agentId?: string | null;
  callsPerMinute: number;
}

interface PolicyStudioClientProps {
  orgId: string;
  initialPolicies: {
    rules: PolicyRule[];
    thresholds: Threshold[];
    budgets: Budget[];
    rate_limits: RateLimit[];
  };
}

export function PolicyStudioClient({ orgId, initialPolicies }: PolicyStudioClientProps) {
  const [message, setMessage] = useState("");
  const [rules, setRules] = useState(initialPolicies.rules);
  const [thresholds, setThresholds] = useState(initialPolicies.thresholds);
  const [budgets, setBudgets] = useState(initialPolicies.budgets);
  const [rateLimits, setRateLimits] = useState(initialPolicies.rate_limits);
  const [simResult, setSimResult] = useState<{
    decision: string;
    trace: Array<{ code: string; message: string }>;
  } | null>(null);

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  async function createRule(formData: FormData) {
    const payload = {
      org_id: orgId,
      agent_id: (formData.get("agent_id") as string) || null,
      tool_name: formData.get("tool_name"),
      tool_action: formData.get("tool_action"),
      effect: formData.get("effect"),
      priority: Number(formData.get("priority") || 100),
      reason: formData.get("reason")
    };

    const response = await fetch(`${API_BASE_URL}/v1/policies/rules`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const rule = await response.json();
      setRules((prev) => [...prev, rule]);
      showMessage("Rule created");
    } else {
      showMessage("Failed to create rule");
    }
  }

  async function deleteRule(id: string) {
    const response = await fetch(`${API_BASE_URL}/v1/policies/rules/${id}`, { method: "DELETE" });
    if (response.ok || response.status === 204) {
      setRules((prev) => prev.filter((r) => r.id !== id));
      showMessage("Rule deleted");
    }
  }

  async function createThreshold(formData: FormData) {
    const payload = {
      org_id: orgId,
      agent_id: (formData.get("agent_id") as string) || null,
      tool_name: formData.get("tool_name"),
      tool_action: formData.get("tool_action"),
      amount_usd: Number(formData.get("amount_usd"))
    };

    const response = await fetch(`${API_BASE_URL}/v1/policies/thresholds`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const threshold = await response.json();
      setThresholds((prev) => [...prev, threshold]);
      showMessage("Threshold created");
    } else {
      showMessage("Failed to create threshold");
    }
  }

  async function deleteThreshold(id: string) {
    const response = await fetch(`${API_BASE_URL}/v1/policies/thresholds/${id}`, { method: "DELETE" });
    if (response.ok || response.status === 204) {
      setThresholds((prev) => prev.filter((t) => t.id !== id));
      showMessage("Threshold deleted");
    }
  }

  async function createBudget(formData: FormData) {
    const payload = {
      org_id: orgId,
      agent_id: (formData.get("agent_id") as string) || null,
      daily_limit_usd: Number(formData.get("daily_limit_usd"))
    };

    const response = await fetch(`${API_BASE_URL}/v1/policies/budgets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const budget = await response.json();
      setBudgets((prev) => [...prev, budget]);
      showMessage("Budget created");
    } else {
      showMessage("Failed to create budget");
    }
  }

  async function deleteBudget(id: string) {
    const response = await fetch(`${API_BASE_URL}/v1/policies/budgets/${id}`, { method: "DELETE" });
    if (response.ok || response.status === 204) {
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      showMessage("Budget deleted");
    }
  }

  async function createRateLimit(formData: FormData) {
    const payload = {
      org_id: orgId,
      agent_id: (formData.get("agent_id") as string) || null,
      calls_per_minute: Number(formData.get("calls_per_minute"))
    };

    const response = await fetch(`${API_BASE_URL}/v1/policies/rate-limits`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const rateLimit = await response.json();
      setRateLimits((prev) => [...prev, rateLimit]);
      showMessage("Rate limit created");
    } else {
      showMessage("Failed to create rate limit");
    }
  }

  async function deleteRateLimit(id: string) {
    const response = await fetch(`${API_BASE_URL}/v1/policies/rate-limits/${id}`, { method: "DELETE" });
    if (response.ok || response.status === 204) {
      setRateLimits((prev) => prev.filter((r) => r.id !== id));
      showMessage("Rate limit deleted");
    }
  }

  async function simulate(formData: FormData) {
    const payload = {
      org_id: orgId,
      agent_id: formData.get("agent_id"),
      tool_name: formData.get("tool_name"),
      tool_action: formData.get("tool_action"),
      cost_estimate_usd: Number(formData.get("cost_estimate_usd") || 0)
    };

    const response = await fetch(`${API_BASE_URL}/v1/policies/simulate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      showMessage("Simulation failed");
      return;
    }

    const data = await response.json();
    setSimResult({ decision: data.decision, trace: data.trace ?? [] });
    showMessage("Simulation complete");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Policy Studio</CardTitle>
                <CardDescription>Manage policy rules, thresholds, budgets, rate limits, and simulate evaluations.</CardDescription>
              </div>
            </div>
            {message && (
              <Badge variant="success">{message}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rules</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{rules.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Thresholds</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{thresholds.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Budgets</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{budgets.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rate Limits</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{rateLimits.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Active Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No rules configured. Create one below.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Effect</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-mono text-xs">{rule.toolName}.{rule.toolAction}</TableCell>
                    <TableCell>
                      <Badge variant={rule.effect === "DENY" ? "destructive" : "success"}>{rule.effect}</Badge>
                    </TableCell>
                    <TableCell>{rule.priority}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{rule.agentId ?? "*"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{rule.reason ?? "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Existing Thresholds, Budgets, Rate Limits */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thresholds ({thresholds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {thresholds.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">None configured.</p>
            ) : (
              <div className="space-y-2">
                {thresholds.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <div>
                      <span className="font-mono text-xs">{t.toolName}.{t.toolAction}</span>
                      <span className="ml-2 text-muted-foreground">&gt; ${t.amountUsd}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteThreshold(t.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budgets ({budgets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">None configured.</p>
            ) : (
              <div className="space-y-2">
                {budgets.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <div>
                      <span className="font-mono text-xs">{b.agentId ?? "org-wide"}</span>
                      <span className="ml-2 text-muted-foreground">${b.dailyLimitUsd}/day</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteBudget(b.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rate Limits ({rateLimits.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {rateLimits.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">None configured.</p>
            ) : (
              <div className="space-y-2">
                {rateLimits.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <div>
                      <span className="font-mono text-xs">{r.agentId ?? "org-wide"}</span>
                      <span className="ml-2 text-muted-foreground">{r.callsPerMinute}/min</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteRateLimit(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Forms */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Allow/Deny Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" action={createRule}>
              <Field label="Agent ID (optional)">
                <Input name="agent_id" placeholder="agent_finance_1 or *" />
              </Field>
              <Field label="Tool Name">
                <Input name="tool_name" defaultValue="stripe" required />
              </Field>
              <Field label="Tool Action">
                <Input name="tool_action" defaultValue="refund" required />
              </Field>
              <Field label="Effect">
                <select name="effect" className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground" defaultValue="DENY">
                  <option value="ALLOW">ALLOW</option>
                  <option value="DENY">DENY</option>
                </select>
              </Field>
              <Field label="Priority">
                <Input name="priority" type="number" defaultValue="10" min={0} required />
              </Field>
              <Field label="Reason">
                <Textarea name="reason" placeholder="Business justification" />
              </Field>
              <Button type="submit">Add Rule</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval Threshold</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" action={createThreshold}>
              <Field label="Agent ID (optional)">
                <Input name="agent_id" placeholder="agent_finance_1" />
              </Field>
              <Field label="Tool Name">
                <Input name="tool_name" defaultValue="stripe" required />
              </Field>
              <Field label="Tool Action">
                <Input name="tool_action" defaultValue="refund" required />
              </Field>
              <Field label="Amount USD">
                <Input name="amount_usd" type="number" step="0.01" defaultValue="50" required />
              </Field>
              <Button type="submit">Add Threshold</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" action={createBudget}>
              <Field label="Agent ID (optional)">
                <Input name="agent_id" placeholder="agent_ops_1" />
              </Field>
              <Field label="Daily Limit USD">
                <Input name="daily_limit_usd" type="number" step="0.01" defaultValue="500" required />
              </Field>
              <Button type="submit">Add Budget</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rate Limit Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" action={createRateLimit}>
              <Field label="Agent ID (optional)">
                <Input name="agent_id" placeholder="agent_ops_1" />
              </Field>
              <Field label="Calls per Minute">
                <Input name="calls_per_minute" type="number" defaultValue="30" min={1} required />
              </Field>
              <Button type="submit">Add Rate Limit</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Simulator */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Simulator</CardTitle>
          <CardDescription>Run a virtual tool call and inspect matched rules and decision trace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5" action={simulate}>
            <Input name="agent_id" placeholder="agent_id" defaultValue="agent_finance_1" required />
            <Input name="tool_name" placeholder="tool_name" defaultValue="stripe" required />
            <Input name="tool_action" placeholder="tool_action" defaultValue="refund" required />
            <Input name="cost_estimate_usd" type="number" step="0.01" defaultValue="75" required />
            <Button type="submit">Simulate</Button>
          </form>

          {simResult && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-3 text-sm font-medium">
                Decision:{" "}
                <Badge variant={simResult.decision === "DENY" ? "destructive" : simResult.decision === "ALLOW" ? "success" : "warning"}>
                  {simResult.decision}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                {simResult.trace.map((item, index) => (
                  <div key={`${item.code}-${index}`} className="rounded-lg border border-border bg-muted/50 p-3">
                    <p className="font-mono text-xs font-medium text-primary">{item.code}</p>
                    <p className="mt-1 text-muted-foreground">{item.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
