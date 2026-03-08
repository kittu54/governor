import type { PrismaClient } from "@prisma/client";
import { evaluatePolicy } from "@governor/policy-engine";
import type {
  PolicyEvaluationInput,
  PolicyEvaluationContext,
  PolicyRule,
  GovernorDecision,
  PolicyDefinition,
  PolicyRuleDefinition,
  RiskClass,
  Condition,
  EnforcementMode,
} from "@governor/shared";
import { isSensitiveRiskClass } from "@governor/shared";

interface SimulationDeps {
  prisma: PrismaClient;
}

/**
 * Convert v2 PolicyRuleDefinition[] to engine-compatible PolicyRule[].
 * subject_type + subject_value encode what the rule applies to.
 */
function definitionRulesToEngineRules(
  rules: PolicyRuleDefinition[],
  orgId: string,
): PolicyRule[] {
  return rules.map((r, idx) => {
    const base = {
      id: r.id ?? `sim_rule_${idx}`,
      org_id: orgId,
      agent_id: "*" as string | undefined,
      tool_name: "*",
      tool_action: "*",
      effect: r.effect === "REQUIRE_APPROVAL" ? "DENY" as const : r.effect,
      priority: r.priority,
      reason: r.reason_template,
      risk_class: undefined as RiskClass | undefined,
      conditions: r.conditions as Condition | undefined,
    };

    switch (r.subject_type) {
      case "TOOL": {
        if (r.subject_value) {
          const parts = r.subject_value.split(".");
          base.tool_name = parts[0] ?? "*";
          base.tool_action = parts[1] ?? "*";
        }
        break;
      }
      case "AGENT":
        base.agent_id = r.subject_value ?? "*";
        break;
      case "RISK_CLASS":
        base.risk_class = (r.subject_value as RiskClass) ?? undefined;
        break;
      case "USER":
      case "ORG":
      case "ENVIRONMENT":
        break;
    }

    return base;
  });
}

export interface SingleSimulationRequest {
  org_id: string;
  policy_version_id: string;
  agent_id: string;
  tool_name: string;
  tool_action: string;
  cost_estimate_usd?: number;
  environment?: EnforcementMode;
  risk_class?: RiskClass;
  metadata?: Record<string, unknown>;
}

export interface SingleSimulationResult {
  current_decision: GovernorDecision;
  simulated_decision: GovernorDecision;
  decision_changed: boolean;
  current_reason: string;
  simulated_reason: string;
  simulated_warnings: string[];
  simulated_would_deny_in_prod: boolean;
  simulated_is_sensitive: boolean;
}

export interface HistoricalSimulationRequest {
  org_id: string;
  policy_version_id: string;
  lookback_hours?: number;
  sample_size?: number;
  agent_id?: string;
  tool_name?: string;
  risk_class?: RiskClass;
}

export interface HistoricalSimulationResult {
  total_evaluations: number;
  sampled: number;
  flipped: {
    allow_to_deny: number;
    allow_to_approval: number;
    deny_to_allow: number;
    total_changed: number;
  };
  estimated_blocked_spend_usd: number;
  estimated_unblocked_spend_usd: number;
  affected_agents: { agent_id: string; flips: number }[];
  affected_tools: { tool: string; flips: number }[];
  affected_risk_classes: { risk_class: string; flips: number }[];
  sample_events: {
    evaluation_id: string;
    tool_name: string;
    tool_action: string;
    risk_class: string | null;
    cost_estimate_usd: number;
    current_decision: GovernorDecision;
    simulated_decision: GovernorDecision;
  }[];
}

export class SimulationService {
  constructor(private readonly deps: SimulationDeps) {}

  async simulateSingle(req: SingleSimulationRequest): Promise<SingleSimulationResult> {
    const version = await this.deps.prisma.policyVersion.findUnique({
      where: { id: req.policy_version_id },
      include: { policy: true },
    });
    if (!version) throw new Error("Policy version not found");

    const orgId = req.org_id;
    const definition = version.definitionJson as unknown as PolicyDefinition;
    const simulatedRules = definitionRulesToEngineRules(definition.rules, orgId);

    const environment = req.environment ?? (version.policy.enforcementMode as EnforcementMode) ?? "DEV";
    const riskClass = req.risk_class ?? "LOW_RISK";
    const sensitive = isSensitiveRiskClass(riskClass);

    const context: PolicyEvaluationContext = {
      org_id: orgId,
      agent_id: req.agent_id,
      tool_name: req.tool_name,
      tool_action: req.tool_action,
      cost_estimate_usd: req.cost_estimate_usd ?? 0,
      environment,
      risk_class: riskClass,
      is_sensitive: sensitive,
      timestamp: new Date().toISOString(),
      metadata: req.metadata,
    };

    const baseInput: PolicyEvaluationInput = {
      context,
      rules: [],
      thresholds: [],
      budgets: { usage: { org_spend_today_usd: 0, agent_spend_today_usd: 0 } },
      rate_limits: { current_calls: 0 },
      policy_version_id: req.policy_version_id,
    };

    const currentResult = evaluatePolicy(baseInput);

    const simulatedInput: PolicyEvaluationInput = {
      ...baseInput,
      rules: simulatedRules,
    };
    const simulatedResult = evaluatePolicy(simulatedInput);

    return {
      current_decision: currentResult.decision,
      simulated_decision: simulatedResult.decision,
      decision_changed: currentResult.decision !== simulatedResult.decision,
      current_reason: currentResult.reason,
      simulated_reason: simulatedResult.reason,
      simulated_warnings: simulatedResult.warnings,
      simulated_would_deny_in_prod: simulatedResult.would_deny_in_prod,
      simulated_is_sensitive: simulatedResult.is_sensitive,
    };
  }

  async simulateHistorical(req: HistoricalSimulationRequest): Promise<HistoricalSimulationResult> {
    const version = await this.deps.prisma.policyVersion.findUnique({
      where: { id: req.policy_version_id },
      include: { policy: true },
    });
    if (!version) throw new Error("Policy version not found");

    const orgId = req.org_id;
    const definition = version.definitionJson as unknown as PolicyDefinition;
    const simulatedRules = definitionRulesToEngineRules(definition.rules, orgId);
    const enforcementMode = (version.policy.enforcementMode as EnforcementMode) ?? "DEV";

    const lookbackMs = (req.lookback_hours ?? 168) * 3600 * 1000;
    const since = new Date(Date.now() - lookbackMs);
    const sampleSize = Math.min(req.sample_size ?? 1000, 5000);

    const where: Record<string, unknown> = {
      orgId,
      createdAt: { gte: since },
    };
    if (req.agent_id) where.agentId = req.agent_id;
    if (req.tool_name) where.toolName = req.tool_name;
    if (req.risk_class) where.riskClass = req.risk_class;

    const totalCount = await this.deps.prisma.evaluation.count({ where });

    const evaluations = await this.deps.prisma.evaluation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: sampleSize,
      select: {
        id: true,
        agentId: true,
        toolName: true,
        toolAction: true,
        riskClass: true,
        decision: true,
        enforcementMode: true,
        costEstimateUsd: true,
        inputFactsJson: true,
      },
    });

    const flipped = { allow_to_deny: 0, allow_to_approval: 0, deny_to_allow: 0, total_changed: 0 };
    let blockedSpend = 0;
    let unblockedSpend = 0;
    const agentFlips = new Map<string, number>();
    const toolFlips = new Map<string, number>();
    const riskFlips = new Map<string, number>();
    const sampleEvents: HistoricalSimulationResult["sample_events"] = [];

    for (const ev of evaluations) {
      const riskClass = (ev.riskClass as RiskClass) ?? "LOW_RISK";
      const sensitive = isSensitiveRiskClass(riskClass);
      const cost = ev.costEstimateUsd ?? 0;
      const env = (ev.enforcementMode as EnforcementMode) ?? enforcementMode;

      const context: PolicyEvaluationContext = {
        org_id: orgId,
        agent_id: ev.agentId,
        tool_name: ev.toolName,
        tool_action: ev.toolAction,
        cost_estimate_usd: cost,
        environment: env,
        risk_class: riskClass,
        is_sensitive: sensitive,
        timestamp: new Date().toISOString(),
        metadata: (ev.inputFactsJson as Record<string, unknown>) ?? {},
      };

      const simulatedInput: PolicyEvaluationInput = {
        context,
        rules: simulatedRules,
        thresholds: [],
        budgets: { usage: { org_spend_today_usd: 0, agent_spend_today_usd: 0 } },
        rate_limits: { current_calls: 0 },
        policy_version_id: req.policy_version_id,
      };

      const simResult = evaluatePolicy(simulatedInput);
      const originalDecision = ev.decision as GovernorDecision;
      const newDecision = simResult.decision;

      if (originalDecision !== newDecision) {
        flipped.total_changed += 1;

        if (originalDecision === "ALLOW" && newDecision === "DENY") {
          flipped.allow_to_deny += 1;
          blockedSpend += cost;
        } else if (originalDecision === "ALLOW" && newDecision === "REQUIRE_APPROVAL") {
          flipped.allow_to_approval += 1;
        } else if (originalDecision === "DENY" && newDecision === "ALLOW") {
          flipped.deny_to_allow += 1;
          unblockedSpend += cost;
        }

        agentFlips.set(ev.agentId, (agentFlips.get(ev.agentId) ?? 0) + 1);
        const toolKey = `${ev.toolName}.${ev.toolAction}`;
        toolFlips.set(toolKey, (toolFlips.get(toolKey) ?? 0) + 1);
        riskFlips.set(riskClass, (riskFlips.get(riskClass) ?? 0) + 1);

        if (sampleEvents.length < 20) {
          sampleEvents.push({
            evaluation_id: ev.id,
            tool_name: ev.toolName,
            tool_action: ev.toolAction,
            risk_class: ev.riskClass,
            cost_estimate_usd: cost,
            current_decision: originalDecision,
            simulated_decision: newDecision,
          });
        }
      }
    }

    const toSorted = (m: Map<string, number>) =>
      Array.from(m.entries())
        .map(([k, v]) => ({ key: k, flips: v }))
        .sort((a, b) => b.flips - a.flips)
        .slice(0, 10);

    return {
      total_evaluations: totalCount,
      sampled: evaluations.length,
      flipped,
      estimated_blocked_spend_usd: Number(blockedSpend.toFixed(2)),
      estimated_unblocked_spend_usd: Number(unblockedSpend.toFixed(2)),
      affected_agents: toSorted(agentFlips).map((a) => ({ agent_id: a.key, flips: a.flips })),
      affected_tools: toSorted(toolFlips).map((t) => ({ tool: t.key, flips: t.flips })),
      affected_risk_classes: toSorted(riskFlips).map((r) => ({ risk_class: r.key, flips: r.flips })),
      sample_events: sampleEvents,
    };
  }
}
