import type { DecisionTraceItem, PolicyEvaluationInput, PolicyEvaluationResult } from "@governor/shared";
import { RISK_CLASS_META } from "@governor/shared";
import { evaluatePolicy } from "./evaluate";

/**
 * Evaluate a policy and return a human-readable explanation
 * alongside the full evaluation result.
 */
export function explain(input: PolicyEvaluationInput): {
  result: PolicyEvaluationResult;
  explanation: string[];
} {
  const result = evaluatePolicy(input);
  const lines: string[] = [];

  const ctx = input.context;
  const riskMeta = RISK_CLASS_META[ctx.risk_class];

  lines.push(`## Evaluation Summary`);
  lines.push(`**Decision: ${result.decision}**`);
  lines.push(`**Reason:** ${result.reason}`);
  lines.push(``);

  lines.push(`### Context`);
  lines.push(`- Organization: ${ctx.org_id}`);
  lines.push(`- Agent: ${ctx.agent_id}`);
  lines.push(`- Tool: ${ctx.tool_name}.${ctx.tool_action}`);
  lines.push(`- Risk Class: ${riskMeta.label} (severity ${riskMeta.severity}/100)`);
  lines.push(`- Cost Estimate: $${ctx.cost_estimate_usd.toFixed(2)}`);
  lines.push(`- Environment: ${ctx.environment}`);
  lines.push(`- Sensitive: ${ctx.is_sensitive ? "Yes" : "No"}`);
  lines.push(``);

  lines.push(`### Evaluation Trace`);
  for (const item of result.trace) {
    const icon = traceIcon(item);
    lines.push(`${icon} [${item.code}] ${item.message}`);
  }
  lines.push(``);

  if (result.warnings.length > 0) {
    lines.push(`### Warnings`);
    for (const w of result.warnings) {
      lines.push(`⚠️  ${w}`);
    }
    lines.push(``);
  }

  lines.push(`### Budget`);
  const bs = result.budget_snapshot;
  lines.push(`- Org spend today: $${bs.org_spend_today_usd.toFixed(2)}${bs.org_limit_usd != null ? ` / $${bs.org_limit_usd.toFixed(2)} limit` : ""}`);
  lines.push(`- Agent spend today: $${bs.agent_spend_today_usd.toFixed(2)}${bs.agent_limit_usd != null ? ` / $${bs.agent_limit_usd.toFixed(2)} limit` : ""}`);

  if (result.rate_limit_snapshot) {
    const rl = result.rate_limit_snapshot;
    lines.push(``);
    lines.push(`### Rate Limit`);
    lines.push(`- Current calls: ${rl.calls_in_current_window} / ${rl.limit} per ${rl.window_seconds}s window`);
  }

  if (result.matched_rule_ids.length > 0) {
    lines.push(``);
    lines.push(`### Matched Rules`);
    lines.push(`- ${result.matched_rule_ids.join(", ")}`);
  }

  return { result, explanation: lines };
}

function traceIcon(item: DecisionTraceItem): string {
  switch (item.code) {
    case "ALLOW":
    case "DEFAULT_ALLOW":
      return "✅";
    case "DENY":
    case "DEFAULT_DENY":
      return "🚫";
    case "REQUIRE_APPROVAL":
    case "APPROVAL_POLICY_CHECK":
      return "⏳";
    case "RULE_MATCH":
      return "📋";
    case "BUDGET_CHECK":
    case "BUDGET_WARN":
      return "💰";
    case "RATE_LIMIT_CHECK":
      return "⏱️";
    case "CONDITION_EVAL":
      return "🔍";
    case "MODE_CHECK":
      return "🔧";
    case "SENSITIVE_CHECK":
      return "⚠️";
    case "RISK_CLASS_CHECK":
      return "🏷️";
    default:
      return "•";
  }
}
