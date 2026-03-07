import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type Redis from "ioredis";
import { evaluatePolicy } from "@governor/policy-engine";
import type { EvaluateRequest, EvaluateResponse, PolicyEvaluationInput } from "@governor/shared";
import type { GovernorEventBus } from "../events/bus";

interface PolicyServiceDependencies {
  prisma: PrismaClient;
  redis: Redis;
  eventBus: GovernorEventBus;
}

export class PolicyService {
  constructor(private readonly deps: PolicyServiceDependencies) {}

  private async loadEvaluationInput(payload: EvaluateRequest, now: Date, simulate = false): Promise<PolicyEvaluationInput> {
    const [{ _sum: orgSum }, { _sum: agentSum }, rules, thresholds, orgBudget, agentBudget, agentRate, orgRate] =
      await Promise.all([
        this.deps.prisma.auditEvent.aggregate({
          _sum: { costEstimateUsd: true },
          where: {
            orgId: payload.org_id,
            timestamp: { gte: startOfDayUTC(now) },
            status: { in: ["PENDING", "SUCCESS", "ERROR", "REQUIRES_APPROVAL"] }
          }
        }),
        this.deps.prisma.auditEvent.aggregate({
          _sum: { costEstimateUsd: true },
          where: {
            orgId: payload.org_id,
            agentId: payload.agent_id,
            timestamp: { gte: startOfDayUTC(now) },
            status: { in: ["PENDING", "SUCCESS", "ERROR", "REQUIRES_APPROVAL"] }
          }
        }),
        this.deps.prisma.policyRule.findMany({
          where: { orgId: payload.org_id },
          orderBy: { priority: "asc" }
        }),
        this.deps.prisma.approvalThreshold.findMany({
          where: { orgId: payload.org_id }
        }),
        this.deps.prisma.budgetLimit.findFirst({
          where: { orgId: payload.org_id, agentId: null },
          orderBy: { createdAt: "desc" }
        }),
        this.deps.prisma.budgetLimit.findFirst({
          where: { orgId: payload.org_id, agentId: payload.agent_id },
          orderBy: { createdAt: "desc" }
        }),
        this.deps.prisma.rateLimitPolicy.findFirst({
          where: { orgId: payload.org_id, agentId: payload.agent_id },
          orderBy: { createdAt: "desc" }
        }),
        this.deps.prisma.rateLimitPolicy.findFirst({
          where: { orgId: payload.org_id, agentId: null },
          orderBy: { createdAt: "desc" }
        })
      ]);

    const minuteBucket = Math.floor(now.getTime() / 60000);
    const rateKey = `governor:rl:${payload.org_id}:${payload.agent_id}:${minuteBucket}`;

    let currentCalls = 0;
    if (simulate) {
      const current = await this.deps.redis.get(rateKey);
      currentCalls = Number(current ?? 0);
    } else {
      const incremented = await this.deps.redis.incr(rateKey);
      if (incremented === 1) {
        await this.deps.redis.expire(rateKey, 60);
      }
      currentCalls = Math.max(0, incremented - 1);
    }

    return {
      context: {
        org_id: payload.org_id,
        user_id: payload.user_id,
        agent_id: payload.agent_id,
        session_id: payload.session_id,
        tool_name: payload.tool_name,
        tool_action: payload.tool_action,
        cost_estimate_usd: payload.cost_estimate_usd ?? 0,
        timestamp: now.toISOString()
      },
      rules: rules.map((rule) => ({
        id: rule.id,
        org_id: rule.orgId,
        agent_id: rule.agentId,
        tool_name: rule.toolName,
        tool_action: rule.toolAction,
        effect: rule.effect,
        priority: rule.priority,
        reason: rule.reason ?? undefined
      })),
      thresholds: thresholds.map((threshold) => ({
        id: threshold.id,
        org_id: threshold.orgId,
        agent_id: threshold.agentId,
        tool_name: threshold.toolName,
        tool_action: threshold.toolAction,
        amount_usd: threshold.amountUsd
      })),
      budgets: {
        org: orgBudget
          ? {
              id: orgBudget.id,
              org_id: orgBudget.orgId,
              agent_id: orgBudget.agentId,
              daily_limit_usd: orgBudget.dailyLimitUsd
            }
          : undefined,
        agent: agentBudget
          ? {
              id: agentBudget.id,
              org_id: agentBudget.orgId,
              agent_id: agentBudget.agentId,
              daily_limit_usd: agentBudget.dailyLimitUsd
            }
          : undefined,
        usage: {
          org_spend_today_usd: orgSum.costEstimateUsd ?? 0,
          agent_spend_today_usd: agentSum.costEstimateUsd ?? 0
        }
      },
      rate_limits: {
        policy: agentRate ?? orgRate
          ? {
              id: (agentRate ?? orgRate)!.id,
              org_id: (agentRate ?? orgRate)!.orgId,
              agent_id: (agentRate ?? orgRate)!.agentId,
              calls_per_minute: (agentRate ?? orgRate)!.callsPerMinute
            }
          : undefined,
        current_calls: currentCalls
      }
    };
  }

  async evaluate(payload: EvaluateRequest, options?: { simulate?: boolean }): Promise<EvaluateResponse> {
    const now = new Date();
    const simulate = options?.simulate ?? false;

    const input = await this.loadEvaluationInput(payload, now, simulate);
    const decision = evaluatePolicy(input);

    if (simulate) {
      return {
        request_id: `sim_${randomUUID()}`,
        decision: decision.decision,
        trace: decision.trace,
        matched_rule_ids: decision.matched_rule_ids
      };
    }

    const auditStatusByDecision = {
      ALLOW: "PENDING",
      DENY: "DENIED",
      REQUIRE_APPROVAL: "REQUIRES_APPROVAL"
    } as const;

    const audit = await this.deps.prisma.auditEvent.create({
      data: {
        timestamp: now,
        orgId: payload.org_id,
        userId: payload.user_id,
        agentId: payload.agent_id,
        sessionId: payload.session_id,
        toolName: payload.tool_name,
        toolAction: payload.tool_action,
        decision: decision.decision,
        status: auditStatusByDecision[decision.decision],
        costEstimateUsd: payload.cost_estimate_usd ?? 0,
        policyTrace: decision.trace,
        inputSummary: payload.input_summary
      }
    });

    this.deps.eventBus.publish({
      type: "audit.created",
      org_id: payload.org_id,
      payload: {
        id: audit.id,
        decision: audit.decision,
        status: audit.status,
        tool_name: audit.toolName,
        tool_action: audit.toolAction,
        timestamp: audit.timestamp
      }
    });

    let approvalRequestId: string | undefined;

    if (decision.decision === "REQUIRE_APPROVAL") {
      const approvalRequest = await this.deps.prisma.approvalRequest.create({
        data: {
          orgId: payload.org_id,
          userId: payload.user_id,
          agentId: payload.agent_id,
          sessionId: payload.session_id,
          toolName: payload.tool_name,
          toolAction: payload.tool_action,
          costEstimateUsd: payload.cost_estimate_usd ?? 0,
          status: "PENDING",
          trace: decision.trace
        }
      });

      approvalRequestId = approvalRequest.id;

      this.deps.eventBus.publish({
        type: "approval.updated",
        org_id: payload.org_id,
        payload: {
          id: approvalRequest.id,
          status: approvalRequest.status,
          requested_at: approvalRequest.requestedAt
        }
      });
    }

    return {
      request_id: audit.id,
      decision: decision.decision,
      trace: decision.trace,
      approval_request_id: approvalRequestId,
      matched_rule_ids: decision.matched_rule_ids
    };
  }
}

function startOfDayUTC(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}
