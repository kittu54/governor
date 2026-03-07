import type { FastifyPluginAsync } from "fastify";
import { ingestEventsRequestSchema } from "@governor/shared";

export const ingestRoutes: FastifyPluginAsync = async (app) => {
  app.post("/events", async (request, reply) => {
    const payload = ingestEventsRequestSchema.parse(request.body);

    const result = await app.prisma.$transaction(async (tx) => {
      await tx.organization.upsert({
        where: { id: payload.run.org_id },
        create: {
          id: payload.run.org_id,
          name: payload.run.org_id
        },
        update: {}
      });

      await tx.agent.upsert({
        where: { id: payload.run.agent_id },
        create: {
          id: payload.run.agent_id,
          orgId: payload.run.org_id,
          name: payload.run.agent_id
        },
        update: {
          orgId: payload.run.org_id
        }
      });

      const run = await tx.agentRun.upsert({
        where: { id: payload.run.run_id },
        create: {
          id: payload.run.run_id,
          orgId: payload.run.org_id,
          agentId: payload.run.agent_id,
          sessionId: payload.run.session_id,
          userId: payload.run.user_id,
          source: payload.run.source,
          provider: payload.run.provider,
          model: payload.run.model,
          framework: payload.run.framework,
          runtime: payload.run.runtime,
          taskName: payload.run.task_name,
          promptHash: payload.run.prompt_hash,
          startedAt: payload.run.started_at ? new Date(payload.run.started_at) : new Date(),
          tags: payload.run.tags,
          metadata: payload.run.metadata,
          status: "RUNNING"
        },
        update: {
          sessionId: payload.run.session_id ?? undefined,
          userId: payload.run.user_id ?? undefined,
          source: payload.run.source,
          provider: payload.run.provider ?? undefined,
          model: payload.run.model ?? undefined,
          framework: payload.run.framework ?? undefined,
          runtime: payload.run.runtime ?? undefined,
          taskName: payload.run.task_name ?? undefined,
          promptHash: payload.run.prompt_hash ?? undefined,
          tags: payload.run.tags ?? undefined,
          metadata: payload.run.metadata ?? undefined
        }
      });

      const incomingEventIds = payload.events
        .map((event) => event.event_id)
        .filter((value): value is string => Boolean(value));

      const existing = incomingEventIds.length
        ? await tx.agentEvent.findMany({
            where: {
              externalEventId: {
                in: incomingEventIds
              }
            },
            select: {
              externalEventId: true
            }
          })
        : [];

      const existingSet = new Set(existing.map((row) => row.externalEventId).filter((value): value is string => Boolean(value)));

      const createEvents = payload.events.filter((event) => {
        if (!event.event_id) {
          return true;
        }
        return !existingSet.has(event.event_id);
      });

      if (createEvents.length > 0) {
        await tx.agentEvent.createMany({
          data: createEvents.map((event) => ({
            externalEventId: event.event_id,
            runId: event.run_id,
            orgId: event.org_id,
            agentId: event.agent_id,
            timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
            type: event.type,
            source: event.source,
            provider: event.provider,
            model: event.model,
            stepName: event.step_name,
            toolName: event.tool_name,
            toolAction: event.tool_action,
            inputTokens: event.input_tokens,
            outputTokens: event.output_tokens,
            costUsd: event.cost_usd ?? 0,
            latencyMs: event.latency_ms,
            status: event.status,
            errorMessage: event.error_message,
            sequence: event.sequence,
            inputPayload: event.input_payload,
            outputPayload: event.output_payload,
            parameters: event.parameters,
            metadata: event.metadata
          }))
        });
      }

      const totals = createEvents.reduce(
        (acc, event) => {
          acc.input += event.input_tokens ?? 0;
          acc.output += event.output_tokens ?? 0;
          acc.cost += event.cost_usd ?? 0;
          if (event.type === "TOOL_CALL") {
            acc.toolCalls += 1;
          }
          return acc;
        },
        {
          input: 0,
          output: 0,
          cost: 0,
          toolCalls: 0
        }
      );

      const terminalEvent = [...createEvents]
        .filter((event) => event.type === "RUN_COMPLETED" || event.type === "RUN_FAILED")
        .sort((a, b) => {
          const aTime = eventTimestamp(a);
          const bTime = eventTimestamp(b);
          if (aTime === bTime) {
            return (a.sequence ?? 0) - (b.sequence ?? 0);
          }
          return aTime - bTime;
        })
        .at(-1);

      const status = payload.finalize?.status
        ?? (terminalEvent?.type === "RUN_FAILED" ? "ERROR" : terminalEvent?.type === "RUN_COMPLETED" ? "SUCCESS" : run.status);

      const endedAt = payload.finalize?.ended_at
        ? new Date(payload.finalize.ended_at)
        : terminalEvent?.timestamp
          ? new Date(terminalEvent.timestamp)
          : run.endedAt;

      const durationMs = payload.finalize?.duration_ms
        ?? (endedAt ? Math.max(0, endedAt.getTime() - run.startedAt.getTime()) : run.durationMs);

      const updatedRun = await tx.agentRun.update({
        where: { id: payload.run.run_id },
        data: {
          totalInputTokens: { increment: totals.input },
          totalOutputTokens: { increment: totals.output },
          totalCostUsd: { increment: totals.cost },
          totalToolCalls: { increment: totals.toolCalls },
          status,
          endedAt: status === "RUNNING" ? null : endedAt,
          durationMs,
          errorMessage: payload.finalize?.error_message ?? terminalEvent?.error_message ?? run.errorMessage
        }
      });

      return {
        runId: updatedRun.id,
        accepted: createEvents.length,
        deduped: payload.events.length - createEvents.length,
        runStatus: updatedRun.status,
        orgId: updatedRun.orgId
      };
    });

    app.eventBus.publish({
      type: "event.ingested",
      org_id: result.orgId,
      payload: {
        run_id: result.runId,
        accepted_events: result.accepted,
        deduped_events: result.deduped
      }
    });

    app.eventBus.publish({
      type: "run.updated",
      org_id: result.orgId,
      payload: {
        run_id: result.runId,
        status: result.runStatus
      }
    });

    return reply.code(202).send({
      run_id: result.runId,
      accepted_events: result.accepted,
      deduped_events: result.deduped,
      run_status: result.runStatus
    });
  });
};

function eventTimestamp(event: { timestamp?: string }) {
  return event.timestamp ? new Date(event.timestamp).getTime() : Date.now();
}
