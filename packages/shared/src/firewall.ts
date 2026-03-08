import type { RiskClass } from "./risk";

export interface FirewallRule {
  risk_class: RiskClass;
  tool_pattern: string;
  action_pattern: string;
  default_decision: "DENY" | "REQUIRE_APPROVAL" | "ALLOW_AUDIT";
  threshold_usd?: number;
  description: string;
  priority: number;
}

export const DEFAULT_FIREWALL_RULES: FirewallRule[] = [
  {
    risk_class: "CODE_EXECUTION",
    tool_pattern: "shell",
    action_pattern: "exec",
    default_decision: "DENY",
    description: "Block shell command execution by AI agents",
    priority: 10,
  },
  {
    risk_class: "CODE_EXECUTION",
    tool_pattern: "*",
    action_pattern: "*",
    default_decision: "DENY",
    description: "Block all code execution unless explicitly allowed",
    priority: 11,
  },
  {
    risk_class: "FILE_MUTATION",
    tool_pattern: "*",
    action_pattern: "delete",
    default_decision: "DENY",
    description: "Block file deletion by AI agents",
    priority: 20,
  },
  {
    risk_class: "FILE_MUTATION",
    tool_pattern: "*",
    action_pattern: "*",
    default_decision: "REQUIRE_APPROVAL",
    description: "Require approval for file mutations",
    priority: 21,
  },
  {
    risk_class: "MONEY_MOVEMENT",
    tool_pattern: "*",
    action_pattern: "*",
    default_decision: "REQUIRE_APPROVAL",
    threshold_usd: 200,
    description: "Require approval for financial transactions over $200",
    priority: 30,
  },
  {
    risk_class: "DATA_EXPORT",
    tool_pattern: "*",
    action_pattern: "*",
    default_decision: "REQUIRE_APPROVAL",
    description: "Require approval for data exports",
    priority: 40,
  },
  {
    risk_class: "EXTERNAL_COMMUNICATION",
    tool_pattern: "*",
    action_pattern: "*",
    default_decision: "REQUIRE_APPROVAL",
    description: "Require approval for outbound communication",
    priority: 50,
  },
  {
    risk_class: "CREDENTIAL_USE",
    tool_pattern: "*",
    action_pattern: "*",
    default_decision: "DENY",
    description: "Block credential access unless explicitly allowed",
    priority: 15,
  },
  {
    risk_class: "ADMIN_ACTION",
    tool_pattern: "*",
    action_pattern: "*",
    default_decision: "REQUIRE_APPROVAL",
    description: "Require approval for admin actions",
    priority: 35,
  },
  {
    risk_class: "PII_ACCESS",
    tool_pattern: "*",
    action_pattern: "*",
    default_decision: "REQUIRE_APPROVAL",
    description: "Require approval for PII access",
    priority: 45,
  },
  {
    risk_class: "DATA_WRITE",
    tool_pattern: "*",
    action_pattern: "*",
    default_decision: "ALLOW_AUDIT",
    description: "Allow database writes but audit all operations",
    priority: 60,
  },
  {
    risk_class: "LOW_RISK",
    tool_pattern: "*",
    action_pattern: "*",
    default_decision: "ALLOW_AUDIT",
    description: "Allow low-risk operations with audit logging",
    priority: 100,
  },
];

export interface FirewallStatus {
  enabled: boolean;
  installed_at: string | null;
  rules_count: number;
  policy_rules_count: number;
  approval_thresholds_count: number;
  denial_rules_count: number;
}

export function firewallRulesToPolicyRules(orgId: string): Array<{
  orgId: string;
  toolName: string;
  toolAction: string;
  effect: "ALLOW" | "DENY";
  priority: number;
  reason: string;
  riskClass: RiskClass;
}> {
  return DEFAULT_FIREWALL_RULES
    .filter((r) => r.default_decision === "DENY")
    .map((r) => ({
      orgId,
      toolName: r.tool_pattern,
      toolAction: r.action_pattern,
      effect: "DENY" as const,
      priority: r.priority,
      reason: `[Firewall] ${r.description}`,
      riskClass: r.risk_class,
    }));
}

export function firewallRulesToApprovalThresholds(orgId: string): Array<{
  orgId: string;
  toolName: string;
  toolAction: string;
  amountUsd: number;
  riskClass: RiskClass;
}> {
  return DEFAULT_FIREWALL_RULES
    .filter((r) => r.default_decision === "REQUIRE_APPROVAL")
    .map((r) => ({
      orgId,
      toolName: r.tool_pattern,
      toolAction: r.action_pattern,
      amountUsd: r.threshold_usd ?? 0,
      riskClass: r.risk_class,
    }));
}

export function firewallRulesToApprovalPolicies(orgId: string): Array<{
  orgId: string;
  name: string;
  riskClass: RiskClass;
  toolName: string | null;
  toolAction: string | null;
  thresholdUsd: number | null;
  requiresReason: boolean;
  autoExpireSeconds: number;
}> {
  return DEFAULT_FIREWALL_RULES
    .filter((r) => r.default_decision === "REQUIRE_APPROVAL")
    .map((r) => ({
      orgId,
      name: `[Firewall] ${r.risk_class}`,
      riskClass: r.risk_class,
      toolName: r.tool_pattern === "*" ? null : r.tool_pattern,
      toolAction: r.action_pattern === "*" ? null : r.action_pattern,
      thresholdUsd: r.threshold_usd ?? null,
      requiresReason: false,
      autoExpireSeconds: 3600,
    }));
}
