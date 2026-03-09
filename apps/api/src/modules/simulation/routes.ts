import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { enforcementModeSchema, riskClassSchema } from "@governor/shared";
import type { RiskClass, EnforcementMode } from "@governor/shared";
import { resolveRequestOrg } from "../../plugins/auth.js";
import { SimulationService, type SingleSimulationRequest, type HistoricalSimulationRequest } from "./service.js";

const simulateSingleSchema = z.object({
  org_id: z.string().min(1),
  policy_version_id: z.string().min(1),
  agent_id: z.string().min(1),
  tool_name: z.string().min(1),
  tool_action: z.string().min(1),
  cost_estimate_usd: z.number().min(0).default(0),
  environment: enforcementModeSchema.optional(),
  risk_class: riskClassSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const simulateHistoricalSchema = z.object({
  org_id: z.string().min(1),
  policy_version_id: z.string().min(1),
  lookback_hours: z.number().int().min(1).max(720).default(168),
  sample_size: z.number().int().min(1).max(5000).default(1000),
  agent_id: z.string().optional(),
  tool_name: z.string().optional(),
  risk_class: riskClassSchema.optional(),
});

export const simulationRoutes: FastifyPluginAsync = async (app) => {
  const service = new SimulationService({ prisma: app.prisma });

  app.post("/simulate", async (request, reply) => {
    const payload = simulateSingleSchema.parse(request.body);
    const orgId = resolveRequestOrg(request, { fromBody: String(payload.org_id) });
    const result = await service.simulateSingle({
      ...payload,
      org_id: orgId,
      risk_class: payload.risk_class as RiskClass | undefined,
      environment: payload.environment as EnforcementMode | undefined,
    } as SingleSimulationRequest);
    return reply.send(result);
  });

  app.post("/simulate-historical", async (request, reply) => {
    const payload = simulateHistoricalSchema.parse(request.body);
    const orgId = resolveRequestOrg(request, { fromBody: String(payload.org_id) });
    const result = await service.simulateHistorical({
      ...payload,
      org_id: orgId,
      risk_class: payload.risk_class as RiskClass | undefined,
    } as HistoricalSimulationRequest);
    return reply.send(result);
  });
};
