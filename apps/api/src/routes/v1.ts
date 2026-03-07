import type { FastifyPluginAsync } from "fastify";
import { evaluateRoutes } from "../modules/policy/evaluate-routes";
import { policyRoutes } from "../modules/policy/routes";
import { auditRoutes } from "../modules/audit/routes";
import { approvalsRoutes } from "../modules/approvals/routes";
import { metricsRoutes } from "../modules/metrics/routes";
import { eventsRoutes } from "../modules/events/routes";
import { ingestRoutes } from "../modules/ingest/routes";
import { runsRoutes } from "../modules/runs/routes";

export const v1Routes: FastifyPluginAsync = async (app) => {
  await app.register(evaluateRoutes);
  await app.register(policyRoutes, { prefix: "/policies" });
  await app.register(auditRoutes, { prefix: "/audit" });
  await app.register(approvalsRoutes, { prefix: "/approvals" });
  await app.register(metricsRoutes, { prefix: "/metrics" });
  await app.register(eventsRoutes, { prefix: "/events" });
  await app.register(ingestRoutes, { prefix: "/ingest" });
  await app.register(runsRoutes, { prefix: "/runs" });
};
