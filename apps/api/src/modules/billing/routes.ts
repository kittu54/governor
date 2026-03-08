import type { FastifyPluginAsync } from "fastify";
import { resolveRequestOrg } from "../../plugins/auth";

const PLAN_LIMITS: Record<string, number> = {
  free: 10_000,
  pro: 100_000,
  enterprise: Infinity,
};

export const billingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/usage", async (request) => {
    const query = request.query as { org_id?: string };
    if (!query.org_id) throw app.httpErrors.badRequest("org_id required");

    const org = await app.prisma.organization.findUnique({
      where: { id: query.org_id },
      select: {
        plan: true,
        actionsThisMonth: true,
        actionsResetAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        billingEmail: true,
      },
    });

    if (!org) throw app.httpErrors.notFound("Organization not found");

    const limit = PLAN_LIMITS[org.plan] ?? PLAN_LIMITS.free;
    const period = new Date().toISOString().slice(0, 7);

    const usageRecord = await app.prisma.usageRecord.findUnique({
      where: { orgId_period: { orgId: query.org_id, period } },
    });

    return {
      plan: org.plan,
      actions_this_month: usageRecord?.actions ?? org.actionsThisMonth,
      evaluations_this_month: usageRecord?.evaluations ?? 0,
      actions_limit: limit === Infinity ? null : limit,
      usage_percentage: limit === Infinity ? 0 : Math.round(((usageRecord?.actions ?? org.actionsThisMonth) / limit) * 100),
      billing_email: org.billingEmail,
      stripe_customer_id: org.stripeCustomerId ? "connected" : null,
      stripe_subscription_id: org.stripeSubscriptionId ? "active" : null,
      current_period: period,
      reset_at: org.actionsResetAt?.toISOString() ?? null,
    };
  });

  app.get("/plans", async () => {
    return {
      plans: [
        {
          id: "free",
          name: "Free",
          actions_per_month: 10_000,
          price_usd: 0,
          features: ["10k actions/month", "Default firewall rules", "Action explorer", "1 org member"],
        },
        {
          id: "pro",
          name: "Pro",
          actions_per_month: 100_000,
          price_usd: 49,
          features: ["100k actions/month", "Custom policies", "Alerts & webhooks", "Unlimited members", "Priority support"],
        },
        {
          id: "enterprise",
          name: "Enterprise",
          actions_per_month: null,
          price_usd: null,
          features: ["Unlimited actions", "SSO / SAML", "Dedicated support", "Custom SLA", "On-prem option"],
        },
      ],
    };
  });

  app.post("/upgrade", async (request, reply) => {
    const body = request.body as { org_id: string; plan: string };
    if (!body.org_id || !body.plan) throw app.httpErrors.badRequest("org_id and plan required");
    const orgId = resolveRequestOrg(request, { fromBody: body.org_id });

    if (!["free", "pro", "enterprise"].includes(body.plan)) {
      throw app.httpErrors.badRequest("Invalid plan");
    }

    const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw app.httpErrors.notFound("Organization not found");

    await app.prisma.organization.update({
      where: { id: orgId },
      data: { plan: body.plan },
    });

    return reply.send({ ok: true, plan: body.plan });
  });
};
