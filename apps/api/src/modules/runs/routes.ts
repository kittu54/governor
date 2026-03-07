import type { FastifyPluginAsync } from "fastify";
import { runAnalyzeSchema } from "@governor/shared";

export const runsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request) => {
    const query = request.query as {
      org_id?: string;
      agent_id?: string;
      provider?: string;
      status?: "RUNNING" | "SUCCESS" | "ERROR" | "CANCELED";
      limit?: string;
    };

    const limit = Math.min(Math.max(Number(query.limit ?? 100), 1), 500);

    const runs = await app.prisma.agentRun.findMany({
      where: {
        orgId: query.org_id,
        agentId: query.agent_id,
        provider: query.provider,
        status: query.status
      },
      orderBy: { startedAt: "desc" },
      take: limit
    });

    return {
      runs: runs.map((run) => ({
        id: run.id,
        org_id: run.orgId,
        agent_id: run.agentId,
        source: run.source,
        provider: run.provider,
        model: run.model,
        framework: run.framework,
        runtime: run.runtime,
        task_name: run.taskName,
        status: run.status,
        started_at: run.startedAt,
        ended_at: run.endedAt,
        duration_ms: run.durationMs,
        total_input_tokens: run.totalInputTokens,
        total_output_tokens: run.totalOutputTokens,
        total_cost_usd: run.totalCostUsd,
        total_tool_calls: run.totalToolCalls,
        error_message: run.errorMessage,
        risk_score: run.riskScore,
        tags: run.tags,
        metadata: run.metadata
      }))
    };
  });

  app.get("/:runId", async (request) => {
    const params = request.params as { runId: string };

    const run = await app.prisma.agentRun.findUnique({
      where: { id: params.runId }
    });

    if (!run) {
      throw app.httpErrors.notFound("Run not found");
    }

    const events = await app.prisma.agentEvent.findMany({
      where: { runId: run.id },
      orderBy: [{ timestamp: "asc" }, { sequence: "asc" }]
    });

    const statusCounts = countBy(events.map((event) => event.type));
    const topCostEvents = [...events]
      .sort((a, b) => b.costUsd - a.costUsd)
      .slice(0, 5)
      .map((event) => ({
        type: event.type,
        step_name: event.stepName,
        tool_name: event.toolName,
        cost_usd: event.costUsd,
        timestamp: event.timestamp
      }));

    const analysis = buildRunAnalysis(run, events);

    return {
      run: {
        id: run.id,
        org_id: run.orgId,
        agent_id: run.agentId,
        source: run.source,
        provider: run.provider,
        model: run.model,
        framework: run.framework,
        runtime: run.runtime,
        task_name: run.taskName,
        status: run.status,
        started_at: run.startedAt,
        ended_at: run.endedAt,
        duration_ms: run.durationMs,
        total_input_tokens: run.totalInputTokens,
        total_output_tokens: run.totalOutputTokens,
        total_cost_usd: run.totalCostUsd,
        total_tool_calls: run.totalToolCalls,
        error_message: run.errorMessage,
        risk_score: run.riskScore,
        tags: run.tags,
        metadata: run.metadata
      },
      summary: {
        event_count: events.length,
        event_type_breakdown: statusCounts,
        avg_event_latency_ms: average(events.map((event) => event.latencyMs).filter((x): x is number => typeof x === "number")),
        top_cost_events: topCostEvents
      },
      analysis,
      events: events.map((event) => ({
        id: event.id,
        run_id: event.runId,
        org_id: event.orgId,
        agent_id: event.agentId,
        timestamp: event.timestamp,
        type: event.type,
        source: event.source,
        provider: event.provider,
        model: event.model,
        step_name: event.stepName,
        tool_name: event.toolName,
        tool_action: event.toolAction,
        input_tokens: event.inputTokens,
        output_tokens: event.outputTokens,
        cost_usd: event.costUsd,
        latency_ms: event.latencyMs,
        status: event.status,
        error_message: event.errorMessage,
        sequence: event.sequence,
        input_payload: event.inputPayload,
        output_payload: event.outputPayload,
        parameters: event.parameters,
        metadata: event.metadata
      }))
    };
  });

  app.post("/:runId/analyze", async (request) => {
    const params = request.params as { runId: string };
    const payload = runAnalyzeSchema.parse(request.body);

    const run = await app.prisma.agentRun.findUnique({ where: { id: params.runId } });
    if (!run) {
      throw app.httpErrors.notFound("Run not found");
    }

    const events = await app.prisma.agentEvent.findMany({
      where: { runId: run.id },
      orderBy: [{ timestamp: "asc" }, { sequence: "asc" }]
    });

    const answer = answerRunQuestion(payload.question, run, events);

    return {
      run_id: run.id,
      question: payload.question,
      answer,
      evidence: {
        status: run.status,
        total_cost_usd: run.totalCostUsd,
        total_input_tokens: run.totalInputTokens,
        total_output_tokens: run.totalOutputTokens,
        total_tool_calls: run.totalToolCalls,
        event_count: events.length,
        error_message: run.errorMessage
      }
    };
  });
};

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function buildRunAnalysis(
  run: {
    status: "RUNNING" | "SUCCESS" | "ERROR" | "CANCELED";
    totalCostUsd: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalToolCalls: number;
    durationMs: number | null;
    errorMessage: string | null;
  },
  events: Array<{
    type: "RUN_STARTED" | "RUN_COMPLETED" | "RUN_FAILED" | "STEP" | "MODEL_CALL" | "MODEL_RESULT" | "TOOL_CALL" | "TOOL_RESULT" | "APPROVAL_REQUESTED";
    latencyMs: number | null;
    costUsd: number;
  }>
) {
  const insights: string[] = [];
  const recommendations: string[] = [];

  if (run.status === "ERROR") {
    insights.push(`Run failed: ${run.errorMessage ?? "no explicit error message recorded"}.`);
    recommendations.push("Add retry policy with exponential backoff for model/tool transient failures.");
  }

  if (run.totalCostUsd > 2) {
    insights.push(`High run cost detected: $${run.totalCostUsd.toFixed(2)}.`);
    recommendations.push("Use lower-cost model tier for non-critical steps or introduce token budget guards.");
  }

  if (run.totalToolCalls >= 4) {
    insights.push(`Tool orchestration is heavy (${run.totalToolCalls} tool calls).`);
    recommendations.push("Cache deterministic tool results and collapse repeated calls in planning step.");
  }

  const avgLatency = average(events.map((event) => event.latencyMs).filter((value): value is number => typeof value === "number"));
  if (avgLatency > 1200) {
    insights.push(`Average event latency is elevated (${avgLatency}ms).`);
    recommendations.push("Parallelize independent steps and enforce timeout budgets per tool/model call.");
  }

  if (run.totalInputTokens > 6000) {
    insights.push(`Prompt/input volume is high (${run.totalInputTokens} input tokens).`);
    recommendations.push("Apply context compression and retrieval truncation before model invocation.");
  }

  if (insights.length === 0) {
    insights.push("Run completed within expected operational envelope.");
    recommendations.push("No urgent action needed; continue monitoring for trend changes.");
  }

  return {
    insights,
    recommendations
  };
}

function answerRunQuestion(
  question: string,
  run: {
    status: string;
    totalCostUsd: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalToolCalls: number;
    durationMs: number | null;
    errorMessage: string | null;
  },
  events: Array<{ type: string; costUsd: number; latencyMs: number | null }>
) {
  const q = question.toLowerCase();

  if (q.includes("cost") || q.includes("expensive") || q.includes("budget")) {
    const topType = [...events].sort((a, b) => b.costUsd - a.costUsd)[0]?.type ?? "N/A";
    return `Run cost is $${run.totalCostUsd.toFixed(4)}. Highest-cost event type: ${topType}. Consider lower-cost model routing for this step.`;
  }

  if (q.includes("fail") || q.includes("error") || q.includes("why")) {
    if (run.status !== "ERROR") {
      return "This run did not fail. For prevention, monitor latency spikes and token growth to avoid regressions.";
    }
    return `Run failed with: ${run.errorMessage ?? "unknown error"}. Primary recommendation: add retries and fallback model/tool path.`;
  }

  if (q.includes("latency") || q.includes("slow") || q.includes("performance")) {
    const avgLatency = average(events.map((event) => event.latencyMs).filter((value): value is number => typeof value === "number"));
    return `Average event latency is ${avgLatency}ms. Use parallel tool calls and stricter timeout limits to improve responsiveness.`;
  }

  if (q.includes("token") || q.includes("prompt")) {
    return `Token profile: input=${run.totalInputTokens}, output=${run.totalOutputTokens}. Use context pruning and retrieval chunk limits for efficiency.`;
  }

  return `Run summary: status=${run.status}, cost=$${run.totalCostUsd.toFixed(4)}, duration=${run.durationMs ?? 0}ms, tool_calls=${run.totalToolCalls}. Focus on cost and latency guardrails for stability.`;
}
