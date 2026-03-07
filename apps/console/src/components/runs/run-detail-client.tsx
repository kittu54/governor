"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type ExperienceMode = "EASY" | "PRO" | "HARDCORE";

interface RunDetailClientProps {
  runId: string;
  orgId: string;
  data: {
    run: {
      id: string;
      org_id: string;
      agent_id: string;
      source: string;
      provider?: string | null;
      model?: string | null;
      framework?: string | null;
      runtime?: string | null;
      task_name?: string | null;
      status: "RUNNING" | "SUCCESS" | "ERROR" | "CANCELED";
      started_at: string;
      ended_at?: string | null;
      duration_ms?: number | null;
      total_input_tokens: number;
      total_output_tokens: number;
      total_cost_usd: number;
      total_tool_calls: number;
      error_message?: string | null;
      risk_score?: number | null;
      tags?: string[];
      metadata?: Record<string, unknown> | null;
    };
    summary: {
      event_count: number;
      event_type_breakdown: Record<string, number>;
      avg_event_latency_ms: number;
      top_cost_events: Array<{
        type: string;
        step_name?: string | null;
        tool_name?: string | null;
        cost_usd: number;
        timestamp: string;
      }>;
    };
    analysis: {
      insights: string[];
      recommendations: string[];
    };
    events: Array<{
      id: string;
      timestamp: string;
      type: string;
      provider?: string | null;
      model?: string | null;
      step_name?: string | null;
      tool_name?: string | null;
      tool_action?: string | null;
      input_tokens?: number | null;
      output_tokens?: number | null;
      cost_usd: number;
      latency_ms?: number | null;
      status?: string | null;
      error_message?: string | null;
      input_payload?: Record<string, unknown> | null;
      output_payload?: Record<string, unknown> | null;
      parameters?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
    }>;
  };
}

export function RunDetailClient({ runId, orgId, data }: RunDetailClientProps) {
  const [mode, setMode] = useState<ExperienceMode>("PRO");
  const [question, setQuestion] = useState("Why did this run cost what it cost?");
  const [answer, setAnswer] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const tokenRatio = useMemo(() => {
    if (data.run.total_input_tokens === 0) {
      return 0;
    }
    return Number((data.run.total_output_tokens / data.run.total_input_tokens).toFixed(2));
  }, [data.run.total_input_tokens, data.run.total_output_tokens]);

  async function ask() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/runs/${runId}/analyze?org_id=${encodeURIComponent(orgId)}`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ question })
      });

      if (!response.ok) {
        setAnswer("Analysis endpoint failed. Try again.");
        return;
      }

      const payload = await response.json();
      setAnswer(payload.answer);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Run Detail</CardTitle>
              <CardDescription>
                {data.run.source} / {data.run.provider ?? "unknown"} / {data.run.model ?? "unknown-model"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={data.run.status === "ERROR" ? "destructive" : data.run.status === "SUCCESS" ? "success" : "default"}>
                {data.run.status}
              </Badge>
              <select
                className="h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground"
                value={mode}
                onChange={(event) => setMode(event.target.value as ExperienceMode)}
              >
                <option value="EASY">Easy View</option>
                <option value="PRO">Pro View</option>
                <option value="HARDCORE">Hardcore Dev View</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 font-mono text-xs text-muted-foreground">{data.run.id}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Duration" value={`${data.run.duration_ms ?? 0} ms`} />
            <Metric label="Cost" value={`$${data.run.total_cost_usd.toFixed(4)}`} />
            <Metric label="Tokens" value={`${data.run.total_input_tokens}/${data.run.total_output_tokens}`} mono />
            <Metric label="Tool Calls" value={String(data.run.total_tool_calls)} />
            <Metric label="Avg Event Latency" value={`${data.summary.avg_event_latency_ms} ms`} />
            <Metric label="Token Ratio" value={String(tokenRatio)} />
            <Metric label="Risk Score" value={(data.run.risk_score ?? 0).toFixed(3)} />
            <Metric label="Events" value={String(data.summary.event_count)} />
          </div>

          {mode !== "EASY" && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card className="border-dashed border-border/60">
                <CardHeader>
                  <CardTitle className="text-base">Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {data.analysis.insights.map((insight, index) => (
                      <li key={index} className="rounded-lg border border-border bg-muted/30 p-3 text-muted-foreground">
                        {insight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-dashed border-border/60">
                <CardHeader>
                  <CardTitle className="text-base">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {data.analysis.recommendations.map((recommendation, index) => (
                      <li key={index} className="rounded-lg border border-border bg-muted/30 p-3 text-muted-foreground">
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analyst Chat</CardTitle>
          <CardDescription>Ask Governor for a scoped analysis/opinion on this run.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={question} onChange={(event) => setQuestion(event.target.value)} />
            <Button onClick={ask} disabled={loading}>
              {loading ? "Thinking..." : "Analyze"}
            </Button>
          </div>
          {answer && <Textarea className="mt-3 min-h-[110px]" value={answer} readOnly />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Event Timeline</CardTitle>
              <CardDescription>Full event-level trace with parameters, costs, and outputs.</CardDescription>
            </div>
            <Badge variant="secondary">{data.events.length} events</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Step / Tool</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{event.type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{event.step_name ?? `${event.tool_name ?? "-"}.${event.tool_action ?? "-"}`}</TableCell>
                  <TableCell>
                    <Badge variant={event.status === "ERROR" ? "destructive" : event.status === "SUCCESS" ? "success" : "secondary"}>
                      {event.status ?? "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{event.input_tokens ?? 0}/{event.output_tokens ?? 0}</TableCell>
                  <TableCell className="font-mono">${event.cost_usd.toFixed(4)}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{event.latency_ms != null ? `${event.latency_ms}ms` : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {mode === "HARDCORE" && (
            <div className="mt-4 space-y-2">
              {data.events.slice(0, 20).map((event) => (
                <details key={`json-${event.id}`} className="rounded-lg border border-border bg-muted/30 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-foreground">{event.type} - raw payload</summary>
                  <pre className="mt-2 overflow-auto text-xs text-muted-foreground">{JSON.stringify(event, null, 2)}</pre>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold text-foreground ${mono ? "font-mono text-sm" : ""}`}>{value}</p>
    </div>
  );
}
