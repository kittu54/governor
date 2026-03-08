import type { FastifyPluginAsync } from "fastify";
import { PUBLIC_ROUTES } from "../plugins/auth.js";
import { evaluateRoutes } from "../modules/policy/evaluate-routes.js";
import { policyRoutes } from "../modules/policy/routes.js";
import { auditRoutes } from "../modules/audit/routes.js";
import { approvalsRoutes } from "../modules/approvals/routes.js";
import { metricsRoutes } from "../modules/metrics/routes.js";
import { eventsRoutes } from "../modules/events/routes.js";
import { ingestRoutes } from "../modules/ingest/routes.js";
import { runsRoutes } from "../modules/runs/routes.js";
import { agentsRoutes } from "../modules/agents/routes.js";
import { gatewayRoutes } from "../modules/gateway/routes.js";
import { apiKeyRoutes } from "../modules/apikeys/routes.js";
import { policiesRoutes } from "../modules/policies/routes.js";
import { toolsRoutes } from "../modules/tools/routes.js";
import { auditLogRoutes } from "../modules/auditlog/routes.js";
import { webhooksRoutes } from "../modules/webhooks/routes.js";
import { simulationRoutes } from "../modules/simulation/routes.js";
import { mcpRoutes } from "../modules/mcp/routes.js";
import { firewallRoutes } from "../modules/firewall/routes.js";
import { actionsRoutes } from "../modules/actions/routes.js";
import { alertRoutes } from "../modules/alerts/routes.js";
import { billingRoutes } from "../modules/billing/routes.js";
import { onboardingRoutes } from "../modules/onboarding/routes.js";
import { meRoutes } from "../modules/me/routes.js";

export const v1Routes: FastifyPluginAsync = async (app) => {
  // Production auth enforcement — reject unauthenticated requests
  if (app.config.NODE_ENV === "production") {
    app.addHook("preHandler", async (request) => {
      if (request.auth?.authMethod) return;

      const path = request.url.split("?")[0];
      if (PUBLIC_ROUTES.has(path)) return;

      const err = new Error(
        "Authentication required. Provide an API key via x-governor-key header or a Bearer token via Authorization header."
      );
      (err as any).statusCode = 401;
      throw err;
    });
  }

  await app.register(evaluateRoutes);
  await app.register(policyRoutes, { prefix: "/policies" });
  await app.register(policiesRoutes, { prefix: "/policies/v2" });
  await app.register(auditRoutes, { prefix: "/audit" });
  await app.register(approvalsRoutes, { prefix: "/approvals" });
  await app.register(metricsRoutes, { prefix: "/metrics" });
  await app.register(eventsRoutes, { prefix: "/events" });
  await app.register(ingestRoutes, { prefix: "/ingest" });
  await app.register(runsRoutes, { prefix: "/runs" });
  await app.register(agentsRoutes, { prefix: "/agents" });
  await app.register(gatewayRoutes, { prefix: "/gateway" });
  await app.register(apiKeyRoutes, { prefix: "/api-keys" });
  await app.register(toolsRoutes, { prefix: "/tools" });
  await app.register(auditLogRoutes, { prefix: "/audit-log" });
  await app.register(webhooksRoutes, { prefix: "/webhooks" });
  await app.register(simulationRoutes, { prefix: "/simulation" });
  await app.register(mcpRoutes, { prefix: "/mcp" });
  await app.register(firewallRoutes, { prefix: "/firewall" });
  await app.register(actionsRoutes, { prefix: "/actions" });
  await app.register(alertRoutes, { prefix: "/alerts" });
  await app.register(billingRoutes, { prefix: "/billing" });
  await app.register(onboardingRoutes, { prefix: "/onboarding" });
  await app.register(meRoutes, { prefix: "/me" });
};
