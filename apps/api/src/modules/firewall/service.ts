import type { PrismaClient } from "@prisma/client";
import {
  DEFAULT_FIREWALL_RULES,
  firewallRulesToPolicyRules,
  firewallRulesToApprovalThresholds,
  firewallRulesToApprovalPolicies,
  type FirewallStatus,
} from "@governor/shared";

export class FirewallService {
  constructor(private readonly prisma: PrismaClient) {}

  async getStatus(orgId: string): Promise<FirewallStatus> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { firewallInstalledAt: true },
    });

    if (!org) {
      return {
        enabled: false,
        installed_at: null,
        rules_count: 0,
        policy_rules_count: 0,
        approval_thresholds_count: 0,
        denial_rules_count: 0,
      };
    }

    const [policyRulesCount, thresholdsCount] = await Promise.all([
      this.prisma.policyRule.count({
        where: { orgId, reason: { startsWith: "[Firewall]" } },
      }),
      this.prisma.approvalThreshold.count({
        where: { orgId },
      }),
    ]);

    return {
      enabled: org.firewallInstalledAt !== null,
      installed_at: org.firewallInstalledAt?.toISOString() ?? null,
      rules_count: DEFAULT_FIREWALL_RULES.length,
      policy_rules_count: policyRulesCount,
      approval_thresholds_count: thresholdsCount,
      denial_rules_count: policyRulesCount,
    };
  }

  async install(orgId: string): Promise<{ installed: boolean; rules_created: number; thresholds_created: number; policies_created: number }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { firewallInstalledAt: true },
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    const policyRules = firewallRulesToPolicyRules(orgId);
    const thresholds = firewallRulesToApprovalThresholds(orgId);
    const approvalPolicies = firewallRulesToApprovalPolicies(orgId);

    await this.prisma.$transaction(async (tx) => {
      for (const rule of policyRules) {
        await tx.policyRule.create({ data: rule });
      }
      for (const threshold of thresholds) {
        await tx.approvalThreshold.create({ data: threshold });
      }
      for (const policy of approvalPolicies) {
        await tx.approvalPolicy.create({ data: policy });
      }

      await tx.organization.update({
        where: { id: orgId },
        data: { firewallInstalledAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          orgId,
          actorType: "SYSTEM",
          eventType: "firewall.installed",
          entityType: "Organization",
          entityId: orgId,
          summary: `AI Action Firewall installed: ${policyRules.length} denial rules, ${thresholds.length} approval thresholds, ${approvalPolicies.length} approval policies`,
        },
      });
    });

    return {
      installed: true,
      rules_created: policyRules.length,
      thresholds_created: thresholds.length,
      policies_created: approvalPolicies.length,
    };
  }

  async uninstall(orgId: string): Promise<{ removed_rules: number; removed_thresholds: number; removed_policies: number }> {
    const [deletedRules, deletedThresholds, deletedPolicies] = await this.prisma.$transaction([
      this.prisma.policyRule.deleteMany({
        where: { orgId, reason: { startsWith: "[Firewall]" } },
      }),
      this.prisma.approvalThreshold.deleteMany({ where: { orgId } }),
      this.prisma.approvalPolicy.deleteMany({
        where: { orgId, name: { startsWith: "[Firewall]" } },
      }),
    ]);

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { firewallInstalledAt: null },
    });

    await this.prisma.auditLog.create({
      data: {
        orgId,
        actorType: "SYSTEM",
        eventType: "firewall.uninstalled",
        entityType: "Organization",
        entityId: orgId,
        summary: `AI Action Firewall removed: ${deletedRules.count} rules, ${deletedThresholds.count} thresholds, ${deletedPolicies.count} policies`,
      },
    });

    return {
      removed_rules: deletedRules.count,
      removed_thresholds: deletedThresholds.count,
      removed_policies: deletedPolicies.count,
    };
  }

  async ensureDefaults(orgId: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { firewallInstalledAt: true },
    });

    if (org?.firewallInstalledAt) return false;

    await this.install(orgId);
    return true;
  }
}
