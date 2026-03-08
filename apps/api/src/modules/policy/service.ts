import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { evaluatePolicy, explain as explainPolicy } from "@governor/policy-engine";
import type {
  EvaluateRequest,
  EvaluateResponse,
  ExplainResponse,
  PolicyEvaluationInput,
  EnforcementMode,
} from "@governor/shared";
import { classifyToolRisk, isSensitiveRiskClass, type RiskClass } from "@governor/shared";
import type { GovernorEventBus } from "../events/bus";

interface PolicyServiceDependencies {
  prisma: PrismaClient;
  redis: Redis;
  eventBus: GovernorEventBus;
}

export class PolicyService {
  constructor(private readonly deps: PolicyServiceDependencies) { }

  private async resolveRiskClass(orgId: string, toolName: string, toolAction: string): Promise<{ riskClass: RiskClass; isSensitive: boolean }> {
    const tool = await this.deps.prisma.tool.findUnique({
      where: { orgId_toolName_toolAction: { orgId, toolName, toolAction } },
    });

    if (tool) {
      return {
        riskClass: tool.riskClass as RiskClass,
        isSensitive: tool.isSensitive,
      };
    }

    const result = classifyToolRisk(toolName, toolAction);
    return {
      riskClass: result.riskClass,
      isSensitive: isSensitiveRiskClass(result.riskClass),
    };
  }

  private async resolveEnvironment(orgId: string, agentId: string, requestEnv?: EnforcementMode): Promise<EnforcementMode> {
    if (requestEnv) return requestEnv;

    const agent = await this.deps.prisma.agent.findUnique({
      where: { id: agentId },
      select: { environment: true },
    });
    if (agent?.environment) return agent.environment as EnforcementMode;

    const org = await this.deps.prisma.organization.findUnique({
      where: { id: orgId },
      select: { defaultMode: true },
    });
    if (org?.defaultMode) return org.defaultMode as EnforcementMode;

    return "DEV";
  }

  private async loadEvaluationInput(payload: EvaluateRequest, now: Date, simulate = false): Promise<PolicyEvaluationInput> {
    const { riskClass, isSensitive } = await this.resolveRiskClass(payload.org_id, payload.tool_name, payload.tool_action);
    const environment = await this.resolveEnvironment(payload.org_id, payload.agent_id, payload.environment);

    const [{ _sum: orgSum }, { _sum: agentSum }, rules, thresholds, orgBudget, agentBudget, agentRate, orgRate, approvalPolicies] =
      await Promise.all([
        this.deps.prisma.auditEvent.aggregate({
          _sum: { costEstimateUsd: true },
          where: {
            orgId: payload.org_id,
            timestamp: { gte: startOfDayUTC(now) },
            status: { in: ["PENDING", "SUCCESS", "ERROR", "REQUIRES_APPROVAL"] },
          },
        }),
        this.deps.prisma.auditEvent.aggregate({
          _sum: { costEstimateUsd: true },
          where: {
            orgId: payload.org_id,
            agentId: payload.agent_id,
            timestamp: { gte: startOfDayUTC(now) },
            status: { in: ["PENDING", "SUCCESS", "ERROR", "REQUIRES_APPROVAL"] },
          },
        }),
        this.deps.prisma.policyRule.findMany({
          where: { orgId: payload.org_id },
          orderBy: { priority: "asc" },
        }),
        this.deps.prisma.approvalThreshold.findMany({
          where: { orgId: payload.org_id },
        }),
        this.deps.prisma.budgetLimit.findFirst({
          where: { orgId: payload.org_id, agentId: null },
          orderBy: { createdAt: "desc" },
        }),
        this.deps.prisma.budgetLimit.findFirst({
          where: { orgId: payload.org_id, agentId: payload.agent_id },
          orderBy: { createdAt: "desc" },
        }),
        this.deps.prisma.rateLimitPolicy.findFirst({
          where: { orgId: payload.org_id, agentId: payload.agent_id },
          orderBy: { createdAt: "desc" },
        }),
        this.deps.prisma.rateLimitPolicy.findFirst({
          where: { orgId: payload.org_id, agentId: null },
          orderBy: { createdAt: "desc" },
        }),
        this.deps.prisma.approvalPolicy.findMany({
          where: { orgId: payload.org_id },
        }),
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
        environment,
        tool_name: payload.tool_name,
        tool_action: payload.tool_action,
        risk_class: riskClass,
        cost_estimate_usd: payload.cost_estimate_usd ?? 0,
        is_sensitive: isSensitive,
        timestamp: now.toISOString(),
        metadata: payload.metadata,
      },
      rules: rules.map((rule) => ({
        id: rule.id,
        org_id: rule.orgId,
        agent_id: rule.agentId,
        tool_name: rule.toolName,
        tool_action: rule.toolAction,
        effect: rule.effect,
        priority: rule.priority,
        reason: rule.reason ?? undefined,
        risk_class: (rule.riskClass as RiskClass) ?? undefined,
        conditions: rule.conditions as unknown as import("@governor/shared").Condition ?? undefined,
      })),
      thresholds: thresholds.map((threshold) => ({
        id: threshold.id,
        org_id: threshold.orgId,
        agent_id: threshold.agentId,
        tool_name: threshold.toolName,
        tool_action: threshold.toolAction,
        amount_usd: threshold.amountUsd,
        risk_class: (threshold.riskClass as RiskClass) ?? undefined,
      })),
      budgets: {
        org: orgBudget
          ? { id: orgBudget.id, org_id: orgBudget.orgId, agent_id: orgBudget.agentId, daily_limit_usd: orgBudget.dailyLimitUsd }
          : undefined,
        agent: agentBudget
          ? { id: agentBudget.id, org_id: agentBudget.orgId, agent_id: agentBudget.agentId, daily_limit_usd: agentBudget.dailyLimitUsd }
          : undefined,
        usage: {
          org_spend_today_usd: orgSum.costEstimateUsd ?? 0,
          agent_spend_today_usd: agentSum.costEstimateUsd ?? 0,
        },
      },
      rate_limits: {
        policy: (() => {
          const effectiveRate = agentRate ?? orgRate;
          if (!effectiveRate) return undefined;
          return { id: effectiveRate.id, org_id: effectiveRate.orgId, agent_id: effectiveRate.agentId, calls_per_minute: effectiveRate.callsPerMinute };
        })(),
        current_calls: currentCalls,
      },
      approval_policies: approvalPolicies.map((ap) => ({
        risk_class: (ap.riskClass as RiskClass) ?? undefined,
        tool_name: ap.toolName ?? undefined,
        tool_action: ap.toolAction ?? undefined,
        threshold_usd: ap.thresholdUsd ?? undefined,
        requires_reason: ap.requiresReason,
        auto_expire_seconds: ap.autoExpireSeconds,
      })),
    };
  }

  async evaluate(payload: EvaluateRequest, options?: { simulate?: boolean }): Promise<EvaluateResponse> {
    const now = new Date();
    const start = performance.now();
    const simulate = options?.simulate ?? payload.dry_run ?? false;

    const input = await this.loadEvaluationInput(payload, now, simulate);
    const result = evaluatePolicy(input);
    const durationMs = Math.round(performance.now() - start);

    if (simulate) {
      return {
        request_id: `sim_${randomUUID()}`,
        decision: result.decision,
        reason: result.reason,
        trace: result.trace,
        warnings: result.warnings,
        risk_class: result.risk_class,
        enforcement_mode: result.enforcement_mode,
        is_sensitive: result.is_sensitive,
        would_deny_in_prod: result.would_deny_in_prod,
        matched_rule_ids: result.matched_rule_ids,
        matched_policy_version_id: result.matched_policy_version_id,
        duration_ms: durationMs,
      };
    }

    const auditStatusByDecision = {
      ALLOW: "PENDING",
      DENY: "DENIED",
      REQUIRE_APPROVAL: "REQUIRES_APPROVAL",
    } as const;

    const [audit, evaluation] = await Promise.all([
      this.deps.prisma.auditEvent.create({
        data: {
          timestamp: now,
          orgId: payload.org_id,
          userId: payload.user_id,
          agentId: payload.agent_id,
          sessionId: payload.session_id,
          toolName: payload.tool_name,
          toolAction: payload.tool_action,
          decision: result.decision,
          status: auditStatusByDecision[result.decision],
          costEstimateUsd: payload.cost_estimate_usd ?? 0,
          policyTrace: result.trace as any,
          inputSummary: payload.input_summary,
        },
      }),
      this.deps.prisma.evaluation.create({
        data: {
          orgId: payload.org_id,
          agentId: payload.agent_id,
          toolName: payload.tool_name,
          toolAction: payload.tool_action,
          riskClass: result.risk_class,
          decision: result.decision,
          enforcementMode: result.enforcement_mode,
          costEstimateUsd: payload.cost_estimate_usd ?? 0,
          matchedPolicyVersionId: result.matched_policy_version_id,
          matchedRuleId: result.matched_rule_ids[0] ?? null,
          traceJson: result.trace as any,
          inputFactsJson: result.normalized_facts as any,
          durationMs,
        },
      }),
    ]);

    this.deps.eventBus.publish({
      type: "audit.created",
      org_id: payload.org_id,
      payload: {
        id: audit.id,
        decision: audit.decision,
        status: audit.status,
        tool_name: audit.toolName,
        tool_action: audit.toolAction,
        timestamp: audit.timestamp,
      },
    });

    let approvalRequestId: string | undefined;

    if (result.decision === "REQUIRE_APPROVAL") {
      const matchedApprovalPolicy = input.approval_policies?.find(
        (ap) => !ap.risk_class || ap.risk_class === result.risk_class
      );

      const approvalRequest = await this.deps.prisma.approvalRequest.create({
        data: {
          orgId: payload.org_id,
          userId: payload.user_id,
          agentId: payload.agent_id,
          sessionId: payload.session_id,
          evaluationId: evaluation.id,
          toolName: payload.tool_name,
          toolAction: payload.tool_action,
          riskClass: result.risk_class,
          costEstimateUsd: payload.cost_estimate_usd ?? 0,
          reason: result.reason,
          status: "PENDING",
          expiresAt: matchedApprovalPolicy
            ? new Date(now.getTime() + matchedApprovalPolicy.auto_expire_seconds * 1000)
            : new Date(now.getTime() + 3600 * 1000),
          evidenceJson: {
            evaluation_id: evaluation.id,
            risk_class: result.risk_class,
            enforcement_mode: result.enforcement_mode,
            cost_estimate_usd: payload.cost_estimate_usd ?? 0,
            input_summary: payload.input_summary,
            trace: result.trace,
          } as any,
          trace: result.trace as any,
        },
      });

      approvalRequestId = approvalRequest.id;

      this.deps.eventBus.publish({
        type: "approval.updated",
        org_id: payload.org_id,
        payload: {
          id: approvalRequest.id,
          status: approvalRequest.status,
          requested_at: approvalRequest.requestedAt,
        },
      });
    }

    return {
      request_id: audit.id,
      decision: result.decision,
      reason: result.reason,
      trace: result.trace,
      warnings: result.warnings,
      risk_class: result.risk_class,
      enforcement_mode: result.enforcement_mode,
      is_sensitive: result.is_sensitive,
      would_deny_in_prod: result.would_deny_in_prod,
      approval_request_id: approvalRequestId,
      matched_rule_ids: result.matched_rule_ids,
      matched_policy_version_id: result.matched_policy_version_id,
      duration_ms: durationMs,
    };
  }

  async evaluateExplain(payload: EvaluateRequest): Promise<ExplainResponse> {
    const now = new Date();
    const start = performance.now();
    const input = await this.loadEvaluationInput(payload, now, true);
    const { result, explanation } = explainPolicy(input);
    const durationMs = Math.round(performance.now() - start);

    return {
      request_id: `explain_${randomUUID()}`,
      decision: result.decision,
      reason: result.reason,
      trace: result.trace,
      warnings: result.warnings,
      risk_class: result.risk_class,
      enforcement_mode: result.enforcement_mode,
      is_sensitive: result.is_sensitive,
      would_deny_in_prod: result.would_deny_in_prod,
      matched_rule_ids: result.matched_rule_ids,
      matched_policy_version_id: result.matched_policy_version_id,
      duration_ms: durationMs,
      explanation,
      normalized_facts: result.normalized_facts,
    };
  }
}

function startOfDayUTC(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}
