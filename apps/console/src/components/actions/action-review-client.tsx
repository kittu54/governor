"use client";

import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ShieldCheck, ShieldX, ShieldAlert, Clock, Bot, Wrench,
  FileText, GitBranch, AlertTriangle, CheckCircle, XCircle, MessageSquare,
  Fingerprint, Gauge,
} from "lucide-react";

interface ActionDetail {
  id: string;
  timestamp: string;
  org_id: string;
  agent: {
    id: string;
    name: string;
    framework?: string;
    provider?: string;
    environment?: string;
    tags?: string[];
    allowed_tools?: unknown;
  };
  tool_name: string;
  tool_action: string;
  risk_class: string;
  risk_severity: number;
  decision: string;
  enforcement_mode: string;
  cost_estimate_usd: number;
  duration_ms?: number;
  trace: Array<{ code: string; message: string; metadata?: Record<string, unknown> }>;
  input_facts?: Record<string, unknown>;
  matched_policy_version?: {
    id: string;
    version_number: number;
    policy_id: string;
    checksum: string;
    created_at: string;
  } | null;
  matched_rule_id?: string;
  approval?: {
    id: string;
    status: string;
    reason?: string;
    requested_at: string;
    expires_at?: string | null;
    decided_at?: string | null;
    decided_by?: string | null;
    actions: Array<{
      id: string;
      action: string;
      comment?: string;
      actor_user_id?: string;
      created_at: string;
    }>;
  } | null;
  audit_event?: {
    id: string;
    status: string;
    latency_ms?: number;
    input_summary?: string;
    output_summary?: string;
    error_message?: string;
  } | null;
  linked_run?: {
    id: string;
    status: string;
    task_name?: string;
    started_at: string;
  } | null;
}

interface ActionReviewProps {
  action: ActionDetail | null;
  orgId: string;
}

const RISK_VARIANTS: Record<string, "destructive" | "warning" | "default"> = {
  MONEY_MOVEMENT: "destructive",
  CODE_EXECUTION: "destructive",
  CREDENTIAL_USE: "destructive",
  ADMIN_ACTION: "destructive",
  EXTERNAL_COMMUNICATION: "warning",
  DATA_EXPORT: "warning",
  FILE_MUTATION: "warning",
  PII_ACCESS: "warning",
  DATA_WRITE: "default",
  LOW_RISK: "default",
};

function DecisionBanner({ decision }: { decision: string }) {
  if (decision === "ALLOW") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3">
        <ShieldCheck className="h-6 w-6 text-emerald-400" />
        <div>
          <p className="font-semibold text-emerald-300">Action Allowed</p>
          <p className="text-xs text-emerald-400/70">This tool invocation was permitted by governance policy</p>
        </div>
      </div>
    );
  }
  if (decision === "DENY") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-3">
        <ShieldX className="h-6 w-6 text-red-400" />
        <div>
          <p className="font-semibold text-red-300">Action Denied</p>
          <p className="text-xs text-red-400/70">This tool invocation was blocked by governance policy</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-950/30 px-4 py-3">
      <ShieldAlert className="h-6 w-6 text-amber-400" />
      <div>
        <p className="font-semibold text-amber-300">Approval Required</p>
        <p className="text-xs text-amber-400/70">This tool invocation requires human approval before execution</p>
      </div>
    </div>
  );
}

export function ActionReviewClient({ action, orgId }: ActionReviewProps) {
  if (!action) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Action Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1">This action may have been removed or the ID is invalid.</p>
        <Link href={"/actions" as Route}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Actions
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={"/actions" as Route}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Actions
          </Button>
        </Link>
        <div className="flex-1" />
        <Badge variant="outline" className="text-xs font-mono">{action.id}</Badge>
      </div>

      <DecisionBanner decision={action.decision} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column: Main details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tool Invocation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4 text-primary" />
                Tool Invocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tool</p>
                  <p className="font-mono text-sm font-medium">{action.tool_name}<span className="text-muted-foreground">.{action.tool_action}</span></p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Timestamp</p>
                  <p className="text-sm flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {new Date(action.timestamp).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cost Estimate</p>
                  <p className="font-mono text-sm">${action.cost_estimate_usd.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Evaluation Latency</p>
                  <p className="text-sm">{action.duration_ms != null ? `${action.duration_ms}ms` : "—"}</p>
                </div>
              </div>
              {action.input_facts && Object.keys(action.input_facts).length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Input Facts</p>
                  <pre className="max-h-[200px] overflow-auto rounded-lg bg-muted/50 p-3 font-mono text-xs">
                    {JSON.stringify(action.input_facts, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Risk Classification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge variant={RISK_VARIANTS[action.risk_class] ?? "default"} className="text-sm px-3 py-1">
                  {action.risk_class.replace(/_/g, " ")}
                </Badge>
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Severity: {action.risk_severity}/100</span>
                </div>
                <Badge variant="outline">{action.enforcement_mode}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Trace */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="h-4 w-4 text-primary" />
                Evaluation Trace
              </CardTitle>
              <CardDescription>Step-by-step policy evaluation decision path</CardDescription>
            </CardHeader>
            <CardContent>
              {action.trace && action.trace.length > 0 ? (
                <div className="space-y-2">
                  {action.trace.map((item, i) => (
                    <div key={i} className="flex gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] font-mono">{item.code}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{item.message}</p>
                        {item.metadata && Object.keys(item.metadata).length > 0 && (
                          <pre className="mt-1.5 max-h-[100px] overflow-auto rounded bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                            {JSON.stringify(item.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No trace data available</p>
              )}
            </CardContent>
          </Card>

          {/* Approval Chain */}
          {action.approval && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Approval Chain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                    <Badge
                      variant={
                        action.approval.status === "APPROVED" ? "success" :
                        action.approval.status === "DENIED" ? "destructive" :
                        action.approval.status === "PENDING" ? "warning" : "secondary"
                      }
                    >
                      {action.approval.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Requested At</p>
                    <p className="text-sm">{new Date(action.approval.requested_at).toLocaleString()}</p>
                  </div>
                  {action.approval.decided_at && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Decided At</p>
                      <p className="text-sm">{new Date(action.approval.decided_at).toLocaleString()}</p>
                    </div>
                  )}
                  {action.approval.decided_by && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Decided By</p>
                      <p className="text-sm font-mono">{action.approval.decided_by}</p>
                    </div>
                  )}
                </div>
                {action.approval.actions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Action History</p>
                    {action.approval.actions.map((a) => (
                      <div key={a.id} className="flex items-start gap-2 rounded border border-border bg-muted/30 p-2 text-xs">
                        {a.action === "APPROVE" && <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5" />}
                        {a.action === "DENY" && <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5" />}
                        {a.action === "COMMENT" && <MessageSquare className="h-3.5 w-3.5 text-blue-400 mt-0.5" />}
                        {a.action === "ESCALATE" && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5" />}
                        <div className="flex-1">
                          <span className="font-medium">{a.action}</span>
                          {a.comment && <span className="text-muted-foreground ml-1.5">— {a.comment}</span>}
                          <p className="text-muted-foreground/70 mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Execution Outcome */}
          {action.audit_event && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" />
                  Execution Outcome
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                    <Badge variant={action.audit_event.status === "SUCCESS" ? "success" : action.audit_event.status === "ERROR" ? "destructive" : "warning"}>
                      {action.audit_event.status}
                    </Badge>
                  </div>
                  {action.audit_event.latency_ms != null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Execution Latency</p>
                      <p className="text-sm">{action.audit_event.latency_ms}ms</p>
                    </div>
                  )}
                </div>
                {action.audit_event.input_summary && (
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Input Summary</p>
                    <p className="text-sm text-muted-foreground">{action.audit_event.input_summary}</p>
                  </div>
                )}
                {action.audit_event.output_summary && (
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Output Summary</p>
                    <p className="text-sm text-muted-foreground">{action.audit_event.output_summary}</p>
                  </div>
                )}
                {action.audit_event.error_message && (
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Error</p>
                    <p className="text-sm text-red-400">{action.audit_event.error_message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Sidebar info */}
        <div className="space-y-4">
          {/* Agent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4 text-primary" />
                Agent
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Name</p>
                <Link href={`/agents/${action.agent.id}?org_id=${encodeURIComponent(orgId)}` as Route} className="text-sm text-primary hover:underline font-medium">
                  {action.agent.name}
                </Link>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">ID</p>
                <p className="font-mono text-xs">{action.agent.id}</p>
              </div>
              {action.agent.framework && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Framework</p>
                  <Badge variant="outline">{action.agent.framework}</Badge>
                </div>
              )}
              {action.agent.provider && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Provider</p>
                  <p className="text-sm">{action.agent.provider}</p>
                </div>
              )}
              {action.agent.environment && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Environment</p>
                  <Badge variant="outline">{action.agent.environment}</Badge>
                </div>
              )}
              {action.agent.tags && (action.agent.tags as string[]).length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {(action.agent.tags as string[]).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[9px]">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Policy Version */}
          {action.matched_policy_version && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Fingerprint className="h-4 w-4 text-primary" />
                  Policy Version
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Version</p>
                  <p className="text-sm font-medium">v{action.matched_policy_version.version_number}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Checksum</p>
                  <p className="font-mono text-xs truncate">{action.matched_policy_version.checksum}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Published</p>
                  <p className="text-xs">{new Date(action.matched_policy_version.created_at).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {action.matched_rule_id && (
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Matched Rule</p>
                <p className="font-mono text-xs">{action.matched_rule_id}</p>
              </CardContent>
            </Card>
          )}

          {/* Linked Run */}
          {action.linked_run && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked Run</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/runs/${action.linked_run.id}?org_id=${encodeURIComponent(orgId)}` as Route} className="text-primary hover:underline text-sm">
                  {action.linked_run.task_name ?? action.linked_run.id}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant={action.linked_run.status === "SUCCESS" ? "success" : action.linked_run.status === "ERROR" ? "destructive" : "warning"}>
                    {action.linked_run.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(action.linked_run.started_at).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
