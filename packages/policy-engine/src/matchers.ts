import type { PolicyRule } from "@governor/shared";

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\\]\\]/g, "\\$&");
  const withWildcards = escaped.replace(/\*/g, ".*");
  return new RegExp(`^${withWildcards}$`);
}

export function wildcardMatch(value: string, pattern: string): boolean {
  return wildcardToRegExp(pattern).test(value);
}

export function ruleMatches(rule: PolicyRule, input: {
  org_id: string;
  agent_id: string;
  tool_name: string;
  tool_action: string;
}): boolean {
  const orgMatch = rule.org_id === input.org_id || rule.org_id === "*";
  const agentMatch = !rule.agent_id || rule.agent_id === "*" || wildcardMatch(input.agent_id, rule.agent_id);
  const toolMatch = wildcardMatch(input.tool_name, rule.tool_name);
  const actionMatch = wildcardMatch(input.tool_action, rule.tool_action);

  return orgMatch && agentMatch && toolMatch && actionMatch;
}
