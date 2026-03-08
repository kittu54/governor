import type { FastifyPluginAsync } from "fastify";
import { requireAuthenticated } from "../../plugins/auth.js";

export const meRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /v1/me
   * Returns the current user's org, profile, plan, onboarding state, and counts.
   * Used by the console to drive the UI without multiple round-trips.
   */
  app.get("/", async (request, reply) => {
    requireAuthenticated(request);

    const orgId = request.auth.orgId;
    const userId = request.auth.userId;

    if (!orgId) {
      return reply.send({
        authenticated: true,
        has_org: false,
        user: userId ? { id: userId } : null,
        org: null,
        onboarding: null,
        counts: null,
      });
    }

    const [org, user, counts] = await Promise.all([
      app.prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          defaultMode: true,
          firewallInstalledAt: true,
          onboardingCompletedAt: true,
          actionsThisMonth: true,
          createdAt: true,
        },
      }),
      userId
        ? app.prisma.user.findFirst({
            where: { orgId, email: userId },
            select: { id: true, email: true, displayName: true, role: true },
          })
        : null,
      app.prisma.$transaction([
        app.prisma.apiKey.count({ where: { orgId, revokedAt: null } }),
        app.prisma.agent.count({ where: { orgId } }),
        app.prisma.evaluation.count({ where: { orgId } }),
        app.prisma.approvalRequest.count({ where: { orgId, status: "PENDING" } }),
        app.prisma.agentRun.count({ where: { orgId } }),
        app.prisma.policy.count({ where: { orgId } }),
      ]),
    ]);

    if (!org) {
      return reply.status(404).send({ error: "Organization not found" });
    }

    const [apiKeyCount, agentCount, actionCount, pendingApprovals, runCount, policyCount] = counts;

    return reply.send({
      authenticated: true,
      has_org: true,
      auth_method: request.auth.authMethod,
      user: user
        ? {
            id: user.id,
            email: user.email,
            display_name: user.displayName,
            role: user.role,
          }
        : userId
          ? { id: userId, email: userId, display_name: null, role: request.auth.orgRole ?? "member" }
          : null,
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        default_mode: org.defaultMode,
        created_at: org.createdAt.toISOString(),
      },
      onboarding: {
        completed: !!org.onboardingCompletedAt,
        firewall_installed: !!org.firewallInstalledAt,
        has_api_key: apiKeyCount > 0,
        has_agent: agentCount > 0,
        has_actions: actionCount > 0,
        has_policy: policyCount > 0,
      },
      counts: {
        api_keys: apiKeyCount,
        agents: agentCount,
        actions: actionCount,
        pending_approvals: pendingApprovals,
        runs: runCount,
        policies: policyCount,
        actions_this_month: org.actionsThisMonth,
      },
    });
  });
};
