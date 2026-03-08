"use client";

import { useRef, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Scale, Trash2, Loader2, Plus, ShieldCheck, AlertTriangle, Gauge, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api";

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

interface AgentOption {
  id: string;
  name: string;
  status: string;
}

interface PolicyStudioClientProps {
  orgId: string;
  initialPolicies: {
    rules: PolicyRule[];
    thresholds: Threshold[];
    budgets: Budget[];
    rate_limits: RateLimit[];
  };
  agents?: AgentOption[];
}

type ToastVariant = "success" | "error";

export function PolicyStudioClient({ orgId, initialPolicies, agents = [] }: PolicyStudioClientProps) {
  const [toast, setToast] = useState<{ text: string; variant: ToastVariant } | null>(null);
  const [rules, setRules] = useState(initialPolicies.rules);
  const [thresholds, setThresholds] = useState(initialPolicies.thresholds);
  const [budgets, setBudgets] = useState(initialPolicies.budgets);
  const [rateLimits, setRateLimits] = useState(initialPolicies.rate_limits);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPendingRule, startRuleTransition] = useTransition();
  const [isPendingThreshold, startThresholdTransition] = useTransition();
  const [isPendingBudget, startBudgetTransition] = useTransition();
  const [isPendingRateLimit, startRateLimitTransition] = useTransition();

  const ruleFormRef = useRef<HTMLFormElement>(null);
  const thresholdFormRef = useRef<HTMLFormElement>(null);
  const budgetFormRef = useRef<HTMLFormElement>(null);
  const rateLimitFormRef = useRef<HTMLFormElement>(null);

  function showToast(text: string, variant: ToastVariant = "success") {
    setToast({ text, variant });
    setTimeout(() => setToast(null), 3000);
  }

  function createRule(formData: FormData) {
    startRuleTransition(async () => {
      const payload = {
        org_id: orgId,
        agent_id: (formData.get("agent_id") as string) || null,
        tool_name: formData.get("tool_name"),
        tool_action: formData.get("tool_action"),
        effect: formData.get("effect"),
        priority: Number(formData.get("priority") || 100),
        reason: formData.get("reason")
      };

      const response = await apiFetch(`/v1/policies/rules`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const rule = await response.json();
        setRules((prev) => [...prev, rule]);
        ruleFormRef.current?.reset();
        showToast("Rule created");
      } else {
        const err = await response.json().catch(() => null);
        showToast(err?.error ?? "Failed to create rule", "error");
      }
    });
  }

  function deleteRule(id: string) {
    setDeletingId(id);
    apiFetch(`/v1/policies/rules/${id}`, { method: "DELETE" }).then((response) => {
      if (response.ok || response.status === 204) {
        setRules((prev) => prev.filter((r) => r.id !== id));
        showToast("Rule deleted");
      } else {
        showToast("Failed to delete rule", "error");
      }
      setDeletingId(null);
    });
  }

  function createThreshold(formData: FormData) {
    startThresholdTransition(async () => {
      const payload = {
        org_id: orgId,
        agent_id: (formData.get("agent_id") as string) || null,
        tool_name: formData.get("tool_name"),
        tool_action: formData.get("tool_action"),
        amount_usd: Number(formData.get("amount_usd"))
      };

      const response = await apiFetch(`/v1/policies/thresholds`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const threshold = await response.json();
        setThresholds((prev) => [...prev, threshold]);
        thresholdFormRef.current?.reset();
        showToast("Threshold created");
      } else {
        const err = await response.json().catch(() => null);
        showToast(err?.error ?? "Failed to create threshold", "error");
      }
    });
  }

  function deleteThreshold(id: string) {
    setDeletingId(id);
    apiFetch(`/v1/policies/thresholds/${id}`, { method: "DELETE" }).then((response) => {
      if (response.ok || response.status === 204) {
        setThresholds((prev) => prev.filter((t) => t.id !== id));
        showToast("Threshold deleted");
      } else {
        showToast("Failed to delete threshold", "error");
      }
      setDeletingId(null);
    });
  }

  function createBudget(formData: FormData) {
    startBudgetTransition(async () => {
      const payload = {
        org_id: orgId,
        agent_id: (formData.get("agent_id") as string) || null,
        daily_limit_usd: Number(formData.get("daily_limit_usd"))
      };

      const response = await apiFetch(`/v1/policies/budgets`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const budget = await response.json();
        setBudgets((prev) => [...prev, budget]);
        budgetFormRef.current?.reset();
        showToast("Budget created");
      } else {
        const err = await response.json().catch(() => null);
        showToast(err?.error ?? "Failed to create budget", "error");
      }
    });
  }

  function deleteBudget(id: string) {
    setDeletingId(id);
    apiFetch(`/v1/policies/budgets/${id}`, { method: "DELETE" }).then((response) => {
      if (response.ok || response.status === 204) {
        setBudgets((prev) => prev.filter((b) => b.id !== id));
        showToast("Budget deleted");
      } else {
        showToast("Failed to delete budget", "error");
      }
      setDeletingId(null);
    });
  }

  function createRateLimit(formData: FormData) {
    startRateLimitTransition(async () => {
      const payload = {
        org_id: orgId,
        agent_id: (formData.get("agent_id") as string) || null,
        calls_per_minute: Number(formData.get("calls_per_minute"))
      };

      const response = await apiFetch(`/v1/policies/rate-limits`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const rateLimit = await response.json();
        setRateLimits((prev) => [...prev, rateLimit]);
        rateLimitFormRef.current?.reset();
        showToast("Rate limit created");
      } else {
        const err = await response.json().catch(() => null);
        showToast(err?.error ?? "Failed to create rate limit", "error");
      }
    });
  }

  function deleteRateLimit(id: string) {
    setDeletingId(id);
    apiFetch(`/v1/policies/rate-limits/${id}`, { method: "DELETE" }).then((response) => {
      if (response.ok || response.status === 204) {
        setRateLimits((prev) => prev.filter((r) => r.id !== id));
        showToast("Rate limit deleted");
      } else {
        showToast("Failed to delete rate limit", "error");
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 animate-in fade-in slide-in-from-top-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
          toast.variant === "error"
            ? "border-red-500/30 bg-red-950/80 text-red-300"
            : "border-emerald-500/30 bg-emerald-950/80 text-emerald-300"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Inline Governance Controls</CardTitle>
              <CardDescription>Real-time allow/deny rules, approval thresholds, budgets, and rate limits applied to every evaluation.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard icon={ShieldCheck} label="Rules" value={rules.length} />
            <StatCard icon={AlertTriangle} label="Thresholds" value={thresholds.length} />
            <StatCard icon={Wallet} label="Budgets" value={budgets.length} />
            <StatCard icon={Gauge} label="Rate Limits" value={rateLimits.length} />
          </div>
        </CardContent>
      </Card>

      {/* Active Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <EmptyState text="No rules configured. Create one below." />
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
                    <TableCell className="text-xs text-muted-foreground">
                        {rule.agentId
                          ? <span className="font-mono">{agents.find(a => a.id === rule.agentId)?.name ?? rule.agentId}</span>
                          : <Badge variant="outline" className="text-[10px]">org-wide</Badge>}
                      </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{rule.reason ?? "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === rule.id}
                        onClick={() => deleteRule(rule.id)}
                      >
                        {deletingId === rule.id
                          ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          : <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />}
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
              <EmptyState text="None configured." />
            ) : (
              <div className="space-y-2">
                {thresholds.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <div>
                      <span className="font-mono text-xs">{t.toolName}.{t.toolAction}</span>
                      <span className="ml-2 text-muted-foreground">&gt; ${t.amountUsd}</span>
                    </div>
                    <Button variant="ghost" size="icon" disabled={deletingId === t.id} onClick={() => deleteThreshold(t.id)}>
                      {deletingId === t.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        : <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />}
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
              <EmptyState text="None configured." />
            ) : (
              <div className="space-y-2">
                {budgets.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <div>
                      <span className="font-mono text-xs">{b.agentId ?? "org-wide"}</span>
                      <span className="ml-2 text-muted-foreground">${b.dailyLimitUsd}/day</span>
                    </div>
                    <Button variant="ghost" size="icon" disabled={deletingId === b.id} onClick={() => deleteBudget(b.id)}>
                      {deletingId === b.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        : <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />}
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
              <EmptyState text="None configured." />
            ) : (
              <div className="space-y-2">
                {rateLimits.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <div>
                      <span className="font-mono text-xs">{r.agentId ?? "org-wide"}</span>
                      <span className="ml-2 text-muted-foreground">{r.callsPerMinute}/min</span>
                    </div>
                    <Button variant="ghost" size="icon" disabled={deletingId === r.id} onClick={() => deleteRateLimit(r.id)}>
                      {deletingId === r.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        : <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />}
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
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create Allow/Deny Rule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form ref={ruleFormRef} className="space-y-3" action={createRule}>
              <Field label="Agent (optional — leave blank for org-wide)">
                <AgentSelect name="agent_id" agents={agents} />
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
              <Button type="submit" disabled={isPendingRule}>
                {isPendingRule ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Add Rule"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Approval Threshold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form ref={thresholdFormRef} className="space-y-3" action={createThreshold}>
              <Field label="Agent (optional — leave blank for org-wide)">
                <AgentSelect name="agent_id" agents={agents} />
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
              <Button type="submit" disabled={isPendingThreshold}>
                {isPendingThreshold ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Add Threshold"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Budget Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form ref={budgetFormRef} className="space-y-3" action={createBudget}>
              <Field label="Agent (optional — leave blank for org-wide)">
                <AgentSelect name="agent_id" agents={agents} />
              </Field>
              <Field label="Daily Limit USD">
                <Input name="daily_limit_usd" type="number" step="0.01" defaultValue="500" required />
              </Field>
              <Button type="submit" disabled={isPendingBudget}>
                {isPendingBudget ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Add Budget"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Rate Limit Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form ref={rateLimitFormRef} className="space-y-3" action={createRateLimit}>
              <Field label="Agent (optional — leave blank for org-wide)">
                <AgentSelect name="agent_id" agents={agents} />
              </Field>
              <Field label="Calls per Minute">
                <Input name="calls_per_minute" type="number" defaultValue="30" min={1} required />
              </Field>
              <Button type="submit" disabled={isPendingRateLimit}>
                {isPendingRateLimit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Add Rate Limit"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-muted-foreground">{text}</p>;
}

function AgentSelect({ name, agents }: { name: string; agents: AgentOption[] }) {
  return (
    <select name={name} className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground">
      <option value="">All agents (org-wide)</option>
      {agents.filter(a => a.status === "ACTIVE").map((a) => (
        <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
      ))}
    </select>
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
