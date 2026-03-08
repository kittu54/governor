"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Play, History, AlertTriangle, ArrowRight,
  TrendingDown, TrendingUp, Activity,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

const RISK_CLASSES = [
  "MONEY_MOVEMENT", "EXTERNAL_COMMUNICATION", "DATA_EXPORT", "DATA_WRITE",
  "CODE_EXECUTION", "FILE_MUTATION", "CREDENTIAL_USE", "PII_ACCESS",
  "ADMIN_ACTION", "LOW_RISK",
] as const;

interface PolicyVersion {
  id: string;
  version_number: number;
  checksum: string;
  is_published: boolean;
  policy_name?: string;
}

interface Props {
  orgId: string;
  policyVersions: PolicyVersion[];
}

interface SingleResult {
  current_decision: string;
  simulated_decision: string;
  decision_changed: boolean;
  current_reason: string;
  simulated_reason: string;
  simulated_warnings: string[];
  simulated_would_deny_in_prod: boolean;
  simulated_is_sensitive: boolean;
}

interface HistoricalResult {
  total_evaluations: number;
  sampled: number;
  flipped: {
    allow_to_deny: number;
    allow_to_approval: number;
    deny_to_allow: number;
    total_changed: number;
  };
  estimated_blocked_spend_usd: number;
  estimated_unblocked_spend_usd: number;
  affected_agents: { agent_id: string; flips: number }[];
  affected_tools: { tool: string; flips: number }[];
  affected_risk_classes: { risk_class: string; flips: number }[];
  sample_events: {
    evaluation_id: string;
    tool_name: string;
    tool_action: string;
    risk_class: string | null;
    cost_estimate_usd: number;
    current_decision: string;
    simulated_decision: string;
  }[];
}

function decisionBadge(decision: string) {
  switch (decision) {
    case "ALLOW": return <Badge variant="success">{decision}</Badge>;
    case "DENY": return <Badge variant="destructive">{decision}</Badge>;
    case "REQUIRE_APPROVAL": return <Badge variant="warning">{decision}</Badge>;
    default: return <Badge>{decision}</Badge>;
  }
}

export function SimulationClient({ orgId, policyVersions }: Props) {
  const [tab, setTab] = useState<"single" | "historical">("single");
  const [isPending, startTransition] = useTransition();
  const [singleResult, setSingleResult] = useState<SingleResult | null>(null);
  const [historicalResult, setHistoricalResult] = useState<HistoricalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runSingleSimulation(formData: FormData) {
    setError(null);
    setSingleResult(null);
    startTransition(async () => {
      const payload = {
        org_id: orgId,
        policy_version_id: formData.get("policy_version_id"),
        agent_id: formData.get("agent_id") || "test-agent",
        tool_name: formData.get("tool_name"),
        tool_action: formData.get("tool_action"),
        cost_estimate_usd: Number(formData.get("cost_estimate_usd") || 0),
        risk_class: formData.get("risk_class") || undefined,
        environment: formData.get("environment") || undefined,
      };

      try {
        const res = await fetch(`${API_BASE_URL}/v1/simulation/simulate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          setError(err?.message ?? `Simulation failed: ${res.status}`);
          return;
        }
        setSingleResult(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      }
    });
  }

  function runHistoricalSimulation(formData: FormData) {
    setError(null);
    setHistoricalResult(null);
    startTransition(async () => {
      const payload = {
        org_id: orgId,
        policy_version_id: formData.get("policy_version_id"),
        lookback_hours: Number(formData.get("lookback_hours") || 168),
        sample_size: Number(formData.get("sample_size") || 1000),
        agent_id: formData.get("agent_id") || undefined,
        tool_name: formData.get("tool_name") || undefined,
        risk_class: formData.get("risk_class") || undefined,
      };

      try {
        const res = await fetch(`${API_BASE_URL}/v1/simulation/simulate-historical`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          setError(err?.message ?? `Simulation failed: ${res.status}`);
          return;
        }
        setHistoricalResult(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Policy Simulation</h3>
        <p className="text-sm text-muted-foreground">
          Test policy versions before deploying. See what would change.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2">
        <Button
          variant={tab === "single" ? "default" : "outline"}
          size="sm"
          onClick={() => { setTab("single"); setError(null); }}
        >
          <Play className="mr-1.5 h-3.5 w-3.5" /> Single Evaluation
        </Button>
        <Button
          variant={tab === "historical" ? "default" : "outline"}
          size="sm"
          onClick={() => { setTab("historical"); setError(null); }}
        >
          <History className="mr-1.5 h-3.5 w-3.5" /> Historical Blast Radius
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="mr-1.5 inline h-4 w-4" /> {error}
        </div>
      )}

      {/* Single evaluation form */}
      {tab === "single" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Simulate Single Evaluation</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-3" action={runSingleSimulation}>
              <div className="space-y-1.5">
                <Label>Policy Version</Label>
                <select name="policy_version_id" required className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground">
                  <option value="">Select version...</option>
                  {policyVersions.map(v => (
                    <option key={v.id} value={v.id}>
                      v{v.version_number} — {v.checksum.slice(0, 8)} {v.is_published ? "(live)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Tool Name</Label>
                <Input name="tool_name" placeholder="e.g. stripe" required />
              </div>
              <div className="space-y-1.5">
                <Label>Tool Action</Label>
                <Input name="tool_action" placeholder="e.g. refund" required />
              </div>
              <div className="space-y-1.5">
                <Label>Agent ID</Label>
                <Input name="agent_id" placeholder="test-agent" />
              </div>
              <div className="space-y-1.5">
                <Label>Cost Estimate ($)</Label>
                <Input name="cost_estimate_usd" type="number" step="0.01" defaultValue="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Risk Class</Label>
                <select name="risk_class" className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground">
                  <option value="">Auto-detect</option>
                  {RISK_CLASSES.map(rc => <option key={rc} value={rc}>{rc}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Environment</Label>
                <select name="environment" className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground">
                  <option value="">Policy default</option>
                  <option value="DEV">DEV</option>
                  <option value="STAGING">STAGING</option>
                  <option value="PROD">PROD</option>
                </select>
              </div>
              <div className="flex items-end sm:col-span-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Simulating...</> : <><Play className="mr-1.5 h-3.5 w-3.5" /> Run Simulation</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Single result */}
      {tab === "single" && singleResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base">
              Simulation Result
              {singleResult.decision_changed ? (
                <Badge variant="warning">Decision Changed</Badge>
              ) : (
                <Badge variant="secondary">No Change</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="mb-1 text-xs text-muted-foreground">Current</p>
                {decisionBadge(singleResult.current_decision)}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-center">
                <p className="mb-1 text-xs text-muted-foreground">Simulated</p>
                {decisionBadge(singleResult.simulated_decision)}
              </div>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Current Reason</p>
                <p>{singleResult.current_reason}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Simulated Reason</p>
                <p>{singleResult.simulated_reason}</p>
              </div>
            </div>
            {singleResult.simulated_would_deny_in_prod && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
                <AlertTriangle className="mr-1.5 inline h-4 w-4" />
                This action would be DENIED in PROD (sensitive: {String(singleResult.simulated_is_sensitive)})
              </div>
            )}
            {singleResult.simulated_warnings.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Warnings</p>
                {singleResult.simulated_warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-400">{w}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historical simulation form */}
      {tab === "historical" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Historical Blast Radius</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-3" action={runHistoricalSimulation}>
              <div className="space-y-1.5">
                <Label>Policy Version</Label>
                <select name="policy_version_id" required className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground">
                  <option value="">Select version...</option>
                  {policyVersions.map(v => (
                    <option key={v.id} value={v.id}>
                      v{v.version_number} — {v.checksum.slice(0, 8)} {v.is_published ? "(live)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Lookback (hours)</Label>
                <Input name="lookback_hours" type="number" defaultValue="168" min="1" max="720" />
              </div>
              <div className="space-y-1.5">
                <Label>Sample Size</Label>
                <Input name="sample_size" type="number" defaultValue="1000" min="1" max="5000" />
              </div>
              <div className="space-y-1.5">
                <Label>Filter: Agent ID</Label>
                <Input name="agent_id" placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Filter: Tool Name</Label>
                <Input name="tool_name" placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Filter: Risk Class</Label>
                <select name="risk_class" className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground">
                  <option value="">All</option>
                  {RISK_CLASSES.map(rc => <option key={rc} value={rc}>{rc}</option>)}
                </select>
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" disabled={isPending}>
                  {isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Running...</> : <><History className="mr-1.5 h-3.5 w-3.5" /> Run Blast Radius Analysis</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Historical result */}
      {tab === "historical" && historicalResult && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <p className="text-2xl font-bold">{historicalResult.sampled}</p>
                <p className="text-xs text-muted-foreground">of {historicalResult.total_evaluations} sampled</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-amber-400" />
                <p className="text-2xl font-bold">{historicalResult.flipped.total_changed}</p>
                <p className="text-xs text-muted-foreground">decisions changed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingDown className="mx-auto mb-1 h-5 w-5 text-red-400" />
                <p className="text-2xl font-bold">${historicalResult.estimated_blocked_spend_usd.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">new spend blocked</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="mx-auto mb-1 h-5 w-5 text-green-400" />
                <p className="text-2xl font-bold">${historicalResult.estimated_unblocked_spend_usd.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">spend unblocked</p>
              </CardContent>
            </Card>
          </div>

          {/* Flip breakdown */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Decision Flip Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 text-sm sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Badge variant="success">ALLOW</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="destructive">DENY</Badge>
                  <span className="ml-auto font-mono font-bold">{historicalResult.flipped.allow_to_deny}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">ALLOW</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="warning">APPROVAL</Badge>
                  <span className="ml-auto font-mono font-bold">{historicalResult.flipped.allow_to_approval}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">DENY</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="success">ALLOW</Badge>
                  <span className="ml-auto font-mono font-bold">{historicalResult.flipped.deny_to_allow}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Affected entities */}
          <div className="grid gap-4 sm:grid-cols-3">
            {historicalResult.affected_tools.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Affected Tools</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {historicalResult.affected_tools.map(t => (
                      <div key={t.tool} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{t.tool}</span>
                        <Badge variant="outline">{t.flips}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {historicalResult.affected_agents.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Affected Agents</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {historicalResult.affected_agents.map(a => (
                      <div key={a.agent_id} className="flex items-center justify-between text-xs">
                        <span className="font-mono truncate">{a.agent_id}</span>
                        <Badge variant="outline">{a.flips}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {historicalResult.affected_risk_classes.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Affected Risk Classes</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {historicalResult.affected_risk_classes.map(r => (
                      <div key={r.risk_class} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{r.risk_class}</span>
                        <Badge variant="outline">{r.flips}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sample events table */}
          {historicalResult.sample_events.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Sample Impacted Events</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4">Tool</th>
                        <th className="pb-2 pr-4">Risk Class</th>
                        <th className="pb-2 pr-4">Cost</th>
                        <th className="pb-2 pr-4">Current</th>
                        <th className="pb-2 pr-4">Simulated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicalResult.sample_events.map((ev, i) => (
                        <tr key={i} className="border-b border-border/30">
                          <td className="py-2 pr-4 font-mono">{ev.tool_name}.{ev.tool_action}</td>
                          <td className="py-2 pr-4"><Badge variant="outline" className="text-[10px]">{ev.risk_class ?? "—"}</Badge></td>
                          <td className="py-2 pr-4">${ev.cost_estimate_usd.toFixed(2)}</td>
                          <td className="py-2 pr-4">{decisionBadge(ev.current_decision)}</td>
                          <td className="py-2 pr-4">{decisionBadge(ev.simulated_decision)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {historicalResult.flipped.total_changed === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No decision changes detected. This policy version would not affect recent evaluations.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
