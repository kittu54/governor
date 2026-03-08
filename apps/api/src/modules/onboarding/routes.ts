import type { FastifyPluginAsync } from "fastify";
import { generateApiKey } from "../gateway/auth";

export const onboardingRoutes: FastifyPluginAsync = async (app) => {
  app.post("/setup", async (request, reply) => {
    const body = request.body as {
      org_name: string;
      user_email?: string;
      user_id?: string;
    };

    if (!body.org_name) {
      throw app.httpErrors.badRequest("org_name is required");
    }

    const slug = body.org_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const orgId = `org_${slug}_${Date.now().toString(36)}`;

    const org = await app.prisma.organization.create({
      data: {
        id: orgId,
        name: body.org_name,
        slug,
        plan: "free",
      },
    });

    if (body.user_email) {
      await app.prisma.user.create({
        data: {
          orgId: org.id,
          email: body.user_email,
          role: "owner",
        },
      });
    }

    const { raw, prefix, hash } = generateApiKey();
    const apiKey = await app.prisma.apiKey.create({
      data: {
        orgId: org.id,
        name: "Default",
        keyHash: hash,
        keyPrefix: prefix,
      },
    });

    try {
      const { FirewallService } = await import("../firewall/service");
      const fw = new FirewallService(app.prisma);
      await fw.ensureDefaults(org.id);
    } catch {
      /* firewall install is best-effort */
    }

    await app.prisma.organization.update({
      where: { id: org.id },
      data: { onboardingCompletedAt: new Date() },
    });

    return reply.code(201).send({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
      },
      api_key: {
        id: apiKey.id,
        key: raw,
        prefix,
        warning: "Store this key securely. It will not be shown again.",
      },
      next_steps: [
        "Install the SDK: npm install @governor/sdk",
        `Set env: GOVERNOR_API_KEY=${raw}`,
        `Set env: GOVERNOR_ORG_ID=${org.id}`,
        "Wrap your agent: protectAgent({ ... })",
        "See actions at /actions",
      ],
    });
  });

  app.get("/status", async (request) => {
    const query = request.query as { org_id?: string };
    if (!query.org_id) throw app.httpErrors.badRequest("org_id required");

    const org = await app.prisma.organization.findUnique({
      where: { id: query.org_id },
      select: {
        id: true,
        name: true,
        plan: true,
        onboardingCompletedAt: true,
        firewallInstalledAt: true,
        _count: {
          select: {
            apiKeys: { where: { revokedAt: null } },
            agents: true,
            auditEvents: true,
          },
        },
      },
    });

    if (!org) throw app.httpErrors.notFound("Organization not found");

    return {
      org_id: org.id,
      org_name: org.name,
      plan: org.plan,
      onboarding_completed: !!org.onboardingCompletedAt,
      firewall_installed: !!org.firewallInstalledAt,
      has_api_key: org._count.apiKeys > 0,
      has_agent: org._count.agents > 0,
      has_actions: org._count.auditEvents > 0,
    };
  });
};
