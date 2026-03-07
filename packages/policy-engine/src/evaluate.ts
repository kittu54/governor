import type {
  ApprovalThreshold,
  DecisionTraceItem,
  PolicyEvaluationInput,
  PolicyEvaluationResult,
  PolicyRule,
  RateLimitPolicy
} from "@governor/shared";
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
    return orgMatch && agentMatch && toolMatch && actionMatch;
  });
}

function chooseRateLimit(policy: RateLimitPolicy | undefined): number {
  if (!policy) {
    return Number.POSITIVE_INFINITY;
  }
  return policy.calls_per_minute;
}

export function evaluatePolicy(input: PolicyEvaluationInput): PolicyEvaluationResult {
  const trace: DecisionTraceItem[] = [];
  const matchedRules = sortRules(input.rules).filter((rule) =>
    ruleMatches(rule, {
      org_id: input.context.org_id,
      agent_id: input.context.agent_id,
      tool_name: input.context.tool_name,
      tool_action: input.context.tool_action
    })
  );

  for (const rule of matchedRules) {
    trace.push({
      code: "RULE_MATCH",
      message: `Matched ${rule.effect} rule ${rule.id}`,
      metadata: {
        rule_id: rule.id,
        effect: rule.effect,
        priority: rule.priority,
        reason: rule.reason
      }
    });
  }

  const budgetSnapshot = {
    org_spend_today_usd: input.budgets.usage.org_spend_today_usd,
    org_limit_usd: input.budgets.org?.daily_limit_usd,
    agent_spend_today_usd: input.budgets.usage.agent_spend_today_usd,
    agent_limit_usd: input.budgets.agent?.daily_limit_usd,
    cost_estimate_usd: input.context.cost_estimate_usd
  };

  trace.push({
    code: "BUDGET_CHECK",
    message: "Evaluated budget limits",
    metadata: budgetSnapshot
  });

  if (input.budgets.org && input.budgets.usage.org_spend_today_usd + input.context.cost_estimate_usd > input.budgets.org.daily_limit_usd) {
    trace.push({
      code: "DENY",
      message: "Organization daily budget exceeded",
      metadata: {
        limit: input.budgets.org.daily_limit_usd,
        projected_spend: input.budgets.usage.org_spend_today_usd + input.context.cost_estimate_usd
      }
    });

    return {
      decision: "DENY",
      trace,
      matched_rule_ids: matchedRules.map((rule) => rule.id),
      budget_snapshot: budgetSnapshot
    };
  }

  if (input.budgets.agent && input.budgets.usage.agent_spend_today_usd + input.context.cost_estimate_usd > input.budgets.agent.daily_limit_usd) {
    trace.push({
      code: "DENY",
      message: "Agent daily budget exceeded",
      metadata: {
        limit: input.budgets.agent.daily_limit_usd,
        projected_spend: input.budgets.usage.agent_spend_today_usd + input.context.cost_estimate_usd
      }
    });

    return {
      decision: "DENY",
      trace,
      matched_rule_ids: matchedRules.map((rule) => rule.id),
      budget_snapshot: budgetSnapshot
    };
  }

  const rateLimit = chooseRateLimit(input.rate_limits.policy);
  const callsInWindow = input.rate_limits.current_calls;

  trace.push({
    code: "RATE_LIMIT_CHECK",
    message: "Evaluated rate limit",
    metadata: {
      limit: Number.isFinite(rateLimit) ? rateLimit : null,
      calls_in_current_window: callsInWindow
    }
  });

  if (Number.isFinite(rateLimit) && callsInWindow >= rateLimit) {
    trace.push({
      code: "DENY",
      message: "Rate limit exceeded",
      metadata: {
        limit: rateLimit,
        calls_in_current_window: callsInWindow
      }
    });

    return {
      decision: "DENY",
      trace,
      matched_rule_ids: matchedRules.map((rule) => rule.id),
      budget_snapshot: budgetSnapshot,
      rate_limit_snapshot: {
        calls_in_current_window: callsInWindow,
        limit: rateLimit,
        window_seconds: 60
      }
    };
  }

  const denyRule = matchedRules.find((rule) => rule.effect === "DENY");
  if (denyRule) {
    trace.push({
      code: "DENY",
      message: `Denied by rule ${denyRule.id}`,
      metadata: {
        rule_id: denyRule.id
      }
    });

    return {
      decision: "DENY",
      trace,
      matched_rule_ids: matchedRules.map((rule) => rule.id),
      budget_snapshot: budgetSnapshot,
      rate_limit_snapshot: Number.isFinite(rateLimit)
        ? {
            calls_in_current_window: callsInWindow,
            limit: rateLimit,
            window_seconds: 60
          }
        : undefined
    };
  }

  const thresholds = matchingThresholds(input.thresholds, input).sort((a, b) => a.amount_usd - b.amount_usd);
  if (thresholds.length > 0) {
    const threshold = thresholds[0];
    trace.push({
      code: "THRESHOLD_CHECK",
      message: `Evaluated approval threshold ${threshold.id}`,
      metadata: {
        threshold: threshold.amount_usd,
        cost_estimate_usd: input.context.cost_estimate_usd
      }
    });

    if (input.context.cost_estimate_usd > threshold.amount_usd) {
      trace.push({
        code: "REQUIRE_APPROVAL",
        message: `Approval required: cost exceeds ${threshold.amount_usd}`,
        metadata: {
          threshold_id: threshold.id
        }
      });

      return {
        decision: "REQUIRE_APPROVAL",
        trace,
        matched_rule_ids: matchedRules.map((rule) => rule.id),
        budget_snapshot: budgetSnapshot,
        rate_limit_snapshot: Number.isFinite(rateLimit)
          ? {
              calls_in_current_window: callsInWindow,
              limit: rateLimit,
              window_seconds: 60
            }
          : undefined
      };
    }
  }

  const allowRule = matchedRules.find((rule) => rule.effect === "ALLOW");
  if (allowRule) {
    trace.push({
      code: "ALLOW",
      message: `Allowed by rule ${allowRule.id}`,
      metadata: {
        rule_id: allowRule.id
      }
    });

    return {
      decision: "ALLOW",
      trace,
      matched_rule_ids: matchedRules.map((rule) => rule.id),
      budget_snapshot: budgetSnapshot,
      rate_limit_snapshot: Number.isFinite(rateLimit)
        ? {
            calls_in_current_window: callsInWindow,
            limit: rateLimit,
            window_seconds: 60
          }
        : undefined
    };
  }

  trace.push({
    code: "DEFAULT_ALLOW",
    message: "No blocking policies matched; default ALLOW"
  });

  return {
    decision: "ALLOW",
    trace,
    matched_rule_ids: matchedRules.map((rule) => rule.id),
    budget_snapshot: budgetSnapshot,
    rate_limit_snapshot: Number.isFinite(rateLimit)
      ? {
          calls_in_current_window: callsInWindow,
          limit: rateLimit,
          window_seconds: 60
        }
      : undefined
  };
}
