import type {
  ApprovalRequirementDefinition,
  ApprovalThreshold,
  DecisionTraceItem,
  GovernorDecision,
  PolicyEvaluationInput,
  PolicyEvaluationResult,
  PolicyRule,
  RateLimitPolicy,
} from "@governor/shared";
import { isSensitiveRiskClass } from "@governor/shared";
import { evaluateCondition } from "./conditions";
import { ruleMatches, wildcardMatch } from "./matchers";

function sortRules(rules: PolicyRule[]): PolicyRule[] {
  return [...rules].sort((a, b) => a.priority - b.priority);
}

function matchingThresholds(thresholds: ApprovalThreshold[], input: PolicyEvaluationInput): ApprovalThreshold[] {
  return thresholds.filter((threshold) => {
    const orgMatch = threshold.org_id === input.context.org_id;
    const agentMatch = !threshold.agent_id || threshold.agent_id === input.context.agent_id || threshold.agent_id === "*";
    const toolMatch = wildcardMatch(input.context.tool_name, threshold.tool_name);
    const actionMatch = wildcardMatch(input.context.tool_action, threshold.tool_action);
    const riskMatch = !threshold.risk_class || threshold.risk_class === input.context.risk_class;
    return orgMatch && agentMatch && toolMatch && actionMatch && riskMatch;
  });
}

function matchingApprovalPolicies(
  policies: ApprovalRequirementDefinition[] | undefined,
  input: PolicyEvaluationInput
): ApprovalRequirementDefinition[] {
  if (!policies || policies.length === 0) return [];
  return policies.filter((p) => {
    if (p.risk_class && p.risk_class !== input.context.risk_class) return false;
    if (p.tool_name && !wildcardMatch(input.context.tool_name, p.tool_name)) return false;
    if (p.tool_action && !wildcardMatch(input.context.tool_action, p.tool_action)) return false;
    if (p.threshold_usd != null && input.context.cost_estimate_usd < p.threshold_usd) return false;
    return true;
  });
}

function buildFacts(input: PolicyEvaluationInput): Record<string, unknown> {
  return {
    org_id: input.context.org_id,
    agent_id: input.context.agent_id,
    user_id: input.context.user_id,
    session_id: input.context.session_id,
    environment: input.context.environment,
    tool_name: input.context.tool_name,
    tool_action: input.context.tool_action,
    risk_class: input.context.risk_class,
    cost_estimate_usd: input.context.cost_estimate_usd,
    is_sensitive: input.context.is_sensitive,
    timestamp: input.context.timestamp,
    org_spend_today_usd: input.budgets.usage.org_spend_today_usd,
    agent_spend_today_usd: input.budgets.usage.agent_spend_today_usd,
    calls_in_window: input.rate_limits.current_calls,
    ...(input.context.metadata || {}),
  };
}

function makeResult(
  decision: GovernorDecision,
  reason: string,
  trace: DecisionTraceItem[],
  warnings: string[],
  matchedRuleIds: string[],
  input: PolicyEvaluationInput,
  facts: Record<string, unknown>
): PolicyEvaluationResult {
  const budgetSnapshot = {
    org_spend_today_usd: input.budgets.usage.org_spend_today_usd,
    org_limit_usd: input.budgets.org?.daily_limit_usd,
    agent_spend_today_usd: input.budgets.usage.agent_spend_today_usd,
    agent_limit_usd: input.budgets.agent?.daily_limit_usd,
    cost_estimate_usd: input.context.cost_estimate_usd,
  };

  const rlPolicy = input.rate_limits.policy;
  const rateSnap = rlPolicy
    ? {
        calls_in_current_window: input.rate_limits.current_calls,
        limit: rlPolicy.calls_per_minute,
        window_seconds: 60,
      }
    : undefined;

  return {
    decision,
    reason,
    trace,
    warnings,
    matched_rule_ids: matchedRuleIds,
    matched_policy_version_id: input.policy_version_id,
    budget_snapshot: budgetSnapshot,
    rate_limit_snapshot: rateSnap,
    normalized_facts: facts,
    enforcement_mode: input.context.environment,
    risk_class: input.context.risk_class,
  };
}

/**
 * Core policy evaluation. Evaluates in this order:
 * 1. Environment mode + sensitive-action baseline
 * 2. Budget checks
 * 3. Rate limit checks
 * 4. Explicit DENY rules
 * 5. Approval requirements (thresholds + approval policies)
 * 6. Explicit ALLOW rules
 * 7. Default fallback based on enforcement mode and sensitivity
 */
export function evaluatePolicy(input: PolicyEvaluationInput): PolicyEvaluationResult {
  const trace: DecisionTraceItem[] = [];
  const warnings: string[] = [];
  const facts = buildFacts(input);
  const now = new Date().toISOString();
  const env = input.context.environment;
  const sensitive = input.context.is_sensitive;
  const riskClass = input.context.risk_class;

  // ─── Step 1: Environment mode baseline ─────────────────────
  trace.push({
    code: "MODE_CHECK",
    check_type: "environment",
    message: `Enforcement mode: ${env}`,
    timestamp: now,
    policy_version_id: input.policy_version_id,
    metadata: { environment: env },
  });

  if (sensitive) {
    trace.push({
      code: "SENSITIVE_CHECK",
      check_type: "sensitivity",
      message: `Action marked sensitive (risk class: ${riskClass}, severity: high)`,
      timestamp: now,
      metadata: { risk_class: riskClass, is_sensitive: true },
    });
  }

  trace.push({
    code: "RISK_CLASS_CHECK",
    check_type: "risk_classification",
    message: `Risk class: ${riskClass}`,
    timestamp: now,
    metadata: { risk_class: riskClass },
  });

  // ─── Step 2: Budget checks ─────────────────────────────────
  const orgBudget = input.budgets.org;
  const agentBudget = input.budgets.agent;
  const costEst = input.context.cost_estimate_usd;

  trace.push({
    code: "BUDGET_CHECK",
    check_type: "budget",
    message: "Evaluating budget limits",
    timestamp: now,
    metadata: {
      org_spend: input.budgets.usage.org_spend_today_usd,
      org_limit: orgBudget?.daily_limit_usd,
      agent_spend: input.budgets.usage.agent_spend_today_usd,
      agent_limit: agentBudget?.daily_limit_usd,
      cost_estimate: costEst,
    },
  });

  if (orgBudget) {
    const projectedOrg = input.budgets.usage.org_spend_today_usd + costEst;
    if (projectedOrg > orgBudget.daily_limit_usd) {
      const reason = `Organization daily budget exceeded: projected $${projectedOrg.toFixed(2)} exceeds limit $${orgBudget.daily_limit_usd.toFixed(2)}`;
      trace.push({
        code: "DENY",
        check_type: "budget",
        message: reason,
        timestamp: now,
        metadata: { limit: orgBudget.daily_limit_usd, projected: projectedOrg },
      });
      return makeResult("DENY", reason, trace, warnings, [], input, facts);
    }
  }

  if (agentBudget) {
    const projectedAgent = input.budgets.usage.agent_spend_today_usd + costEst;
    if (projectedAgent > agentBudget.daily_limit_usd) {
      const reason = `Agent daily budget exceeded: projected $${projectedAgent.toFixed(2)} exceeds limit $${agentBudget.daily_limit_usd.toFixed(2)}`;
      trace.push({
        code: "DENY",
        check_type: "budget",
        message: reason,
        timestamp: now,
        metadata: { limit: agentBudget.daily_limit_usd, projected: projectedAgent },
      });
      return makeResult("DENY", reason, trace, warnings, [], input, facts);
    }
  }

  // ─── Step 3: Rate limit checks ────────────────────────────
  const rlPolicy = input.rate_limits.policy;
  const callsInWindow = input.rate_limits.current_calls;

  if (rlPolicy) {
    trace.push({
      code: "RATE_LIMIT_CHECK",
      check_type: "rate_limit",
      message: `Rate limit: ${callsInWindow}/${rlPolicy.calls_per_minute} calls per minute`,
      timestamp: now,
      metadata: { limit: rlPolicy.calls_per_minute, current: callsInWindow },
    });

    if (callsInWindow >= rlPolicy.calls_per_minute) {
      const reason = `Rate limit exceeded: ${callsInWindow} calls in current window (limit: ${rlPolicy.calls_per_minute})`;
      trace.push({
        code: "DENY",
        check_type: "rate_limit",
        message: reason,
        timestamp: now,
        metadata: { limit: rlPolicy.calls_per_minute, current: callsInWindow },
      });
      return makeResult("DENY", reason, trace, warnings, [], input, facts);
    }
  }

  // ─── Step 4: Rule matching ─────────────────────────────────
  const sortedRules = sortRules(input.rules);
  const matchedRules: PolicyRule[] = [];

  for (const rule of sortedRules) {
    const basicMatch = ruleMatches(rule, {
      org_id: input.context.org_id,
      agent_id: input.context.agent_id,
      tool_name: input.context.tool_name,
      tool_action: input.context.tool_action,
    });

    if (!basicMatch) continue;

    if (rule.risk_class && rule.risk_class !== riskClass) continue;

    if (rule.conditions) {
      const conditionResult = evaluateCondition(rule.conditions, facts);
      trace.push({
        code: "CONDITION_EVAL",
        check_type: "condition",
        message: `Condition on rule ${rule.id}: ${conditionResult ? "passed" : "failed"}`,
        timestamp: now,
        matched_rule_id: rule.id,
        metadata: { rule_id: rule.id, result: conditionResult },
      });
      if (!conditionResult) continue;
    }

    matchedRules.push(rule);
    trace.push({
      code: "RULE_MATCH",
      check_type: "rule",
      message: `Matched ${rule.effect} rule "${rule.id}" (priority ${rule.priority})${rule.reason ? `: ${rule.reason}` : ""}`,
      timestamp: now,
      matched_rule_id: rule.id,
      metadata: { rule_id: rule.id, effect: rule.effect, priority: rule.priority, reason: rule.reason },
    });
  }

  const matchedIds = matchedRules.map((r) => r.id);

  // ─── Step 4a: Explicit DENY rules ─────────────────────────
  const denyRule = matchedRules.find((r) => r.effect === "DENY");
  if (denyRule) {
    const reason = denyRule.reason || `Denied by rule ${denyRule.id}`;
    trace.push({
      code: "DENY",
      check_type: "rule",
      message: reason,
      timestamp: now,
      matched_rule_id: denyRule.id,
      metadata: { rule_id: denyRule.id },
    });
    return makeResult("DENY", reason, trace, warnings, matchedIds, input, facts);
  }

  // ─── Step 5: Approval requirements ────────────────────────
  // 5a: Threshold-based approvals
  const thresholds = matchingThresholds(input.thresholds, input).sort((a, b) => a.amount_usd - b.amount_usd);
  for (const threshold of thresholds) {
    trace.push({
      code: "THRESHOLD_CHECK",
      check_type: "approval_threshold",
      message: `Checking threshold ${threshold.id}: cost $${costEst.toFixed(2)} vs limit $${threshold.amount_usd.toFixed(2)}`,
      timestamp: now,
      metadata: { threshold_id: threshold.id, threshold_usd: threshold.amount_usd, cost: costEst },
    });

    if (costEst > threshold.amount_usd) {
      const reason = `Approval required: cost $${costEst.toFixed(2)} exceeds threshold $${threshold.amount_usd.toFixed(2)}`;
      trace.push({
        code: "REQUIRE_APPROVAL",
        check_type: "approval_threshold",
        message: reason,
        timestamp: now,
        metadata: { threshold_id: threshold.id },
      });
      return makeResult("REQUIRE_APPROVAL", reason, trace, warnings, matchedIds, input, facts);
    }
  }

  // 5b: Approval policy-based (risk class, tool matching)
  const approvalPolicies = matchingApprovalPolicies(input.approval_policies, input);
  if (approvalPolicies.length > 0) {
    const ap = approvalPolicies[0];
    const reason = `Approval required by policy: ${ap.risk_class ? `risk class ${ap.risk_class}` : ""}${ap.tool_name ? ` tool ${ap.tool_name}` : ""}`.trim();
    trace.push({
      code: "APPROVAL_POLICY_CHECK",
      check_type: "approval_policy",
      message: reason,
      timestamp: now,
      metadata: { approval_policy: ap },
    });
    return makeResult("REQUIRE_APPROVAL", reason, trace, warnings, matchedIds, input, facts);
  }

  // ─── Step 6: Explicit ALLOW rules ─────────────────────────
  const allowRule = matchedRules.find((r) => r.effect === "ALLOW");
  if (allowRule) {
    const reason = allowRule.reason || `Allowed by rule ${allowRule.id}`;
    trace.push({
      code: "ALLOW",
      check_type: "rule",
      message: reason,
      timestamp: now,
      matched_rule_id: allowRule.id,
      metadata: { rule_id: allowRule.id },
    });
    return makeResult("ALLOW", reason, trace, warnings, matchedIds, input, facts);
  }

  // ─── Step 7: Default fallback ─────────────────────────────
  switch (env) {
    case "PROD": {
      if (sensitive || isSensitiveRiskClass(riskClass)) {
        const reason = `Default DENY in PROD for sensitive action (risk class: ${riskClass})`;
        trace.push({
          code: "DEFAULT_DENY",
          check_type: "default_fallback",
          message: reason,
          timestamp: now,
          metadata: { environment: "PROD", risk_class: riskClass, is_sensitive: sensitive },
        });
        return makeResult("DENY", reason, trace, warnings, matchedIds, input, facts);
      }
      const reason = "Default ALLOW in PROD for non-sensitive action (no matching policies)";
      trace.push({
        code: "DEFAULT_ALLOW",
        check_type: "default_fallback",
        message: reason,
        timestamp: now,
        metadata: { environment: "PROD", risk_class: riskClass },
      });
      return makeResult("ALLOW", reason, trace, warnings, matchedIds, input, facts);
    }

    case "STAGING": {
      if (sensitive || isSensitiveRiskClass(riskClass)) {
        warnings.push(`STAGING warning: sensitive action ${input.context.tool_name}.${input.context.tool_action} (${riskClass}) would be DENIED in PROD`);
      }
      const reason = "Default ALLOW in STAGING with warnings";
      trace.push({
        code: "DEFAULT_ALLOW",
        check_type: "default_fallback",
        message: reason,
        timestamp: now,
        metadata: { environment: "STAGING", risk_class: riskClass, warnings },
      });
      return makeResult("ALLOW", reason, trace, warnings, matchedIds, input, facts);
    }

    case "DEV":
    default: {
      const reason = "Default ALLOW in DEV mode (audit only)";
      trace.push({
        code: "DEFAULT_ALLOW",
        check_type: "default_fallback",
        message: reason,
        timestamp: now,
        metadata: { environment: env, risk_class: riskClass },
      });
      return makeResult("ALLOW", reason, trace, warnings, matchedIds, input, facts);
    }
  }
}
