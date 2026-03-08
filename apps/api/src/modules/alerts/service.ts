import type { PrismaClient } from "@prisma/client";
import type { GovernorEventBus } from "../events/bus.js";

export interface AlertPayload {
  org_id: string;
  alert_type: "HIGH_RISK_ACTION" | "POLICY_DENIAL" | "MONEY_MOVEMENT" | "APPROVAL_REQUIRED" | "BUDGET_WARNING";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export class AlertService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: GovernorEventBus,
  ) {}

  async getConfigs(orgId: string) {
    return this.prisma.alertConfig.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createConfig(data: {
    orgId: string;
    name: string;
    channel: "WEBHOOK" | "SLACK";
    alertTypes: string[];
    config: Record<string, unknown>;
    isActive?: boolean;
  }) {
    return this.prisma.alertConfig.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        channel: data.channel,
        alertTypes: data.alertTypes as any,
        config: data.config as any,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateConfig(id: string, orgId: string, data: Partial<{
    name: string;
    alertTypes: string[];
    config: Record<string, unknown>;
    isActive: boolean;
  }>) {
    return this.prisma.alertConfig.update({
      where: { id },
      data: {
        name: data.name,
        alertTypes: data.alertTypes as any,
        config: data.config !== undefined ? (data.config as any) : undefined,
        isActive: data.isActive,
      },
    });
  }

  async deleteConfig(id: string) {
    return this.prisma.alertConfig.delete({ where: { id } });
  }

  async fire(alert: AlertPayload): Promise<{ delivered: number; errors: string[] }> {
    const configs = await this.prisma.alertConfig.findMany({
      where: {
        orgId: alert.org_id,
        isActive: true,
      },
    });

    const matching = configs.filter((c) => {
      const types = c.alertTypes as string[];
      return types.includes(alert.alert_type) || types.includes("*");
    });

    let delivered = 0;
    const errors: string[] = [];

    for (const config of matching) {
      try {
        if (config.channel === "WEBHOOK") {
          await this.deliverWebhook(config.config as Record<string, unknown>, alert);
          delivered++;
        } else if (config.channel === "SLACK") {
          await this.deliverSlack(config.config as Record<string, unknown>, alert);
          delivered++;
        }
      } catch (err) {
        errors.push(`${config.name}: ${err instanceof Error ? err.message : "delivery failed"}`);
      }
    }

    this.eventBus.publish({
      type: "alert.fired",
      org_id: alert.org_id,
      payload: {
        alert_type: alert.alert_type,
        severity: alert.severity,
        title: alert.title,
        delivered,
        errors: errors.length,
      },
    });

    return { delivered, errors };
  }

  private async deliverWebhook(config: Record<string, unknown>, alert: AlertPayload): Promise<void> {
    const url = config.url as string;
    if (!url) throw new Error("Webhook URL not configured");

    const headers: Record<string, string> = { "content-type": "application/json" };
    if (config.secret) {
      headers["x-governor-signature"] = String(config.secret);
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        event: "governor.alert",
        alert_type: alert.alert_type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        metadata: alert.metadata,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }
  }

  private async deliverSlack(config: Record<string, unknown>, alert: AlertPayload): Promise<void> {
    const webhookUrl = config.webhook_url as string;
    if (!webhookUrl) throw new Error("Slack webhook URL not configured");

    const severityEmoji: Record<string, string> = {
      critical: ":rotating_light:",
      high: ":warning:",
      medium: ":large_yellow_circle:",
      low: ":information_source:",
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `${severityEmoji[alert.severity] ?? ""} Governor Alert: ${alert.title}` },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Type:* ${alert.alert_type}` },
              { type: "mrkdwn", text: `*Severity:* ${alert.severity}` },
            ],
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: alert.message },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook returned ${response.status}`);
    }
  }
}
