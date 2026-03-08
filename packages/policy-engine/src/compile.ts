import type { PolicyDefinition, PolicyRuleDefinition } from "@governor/shared";
import { RISK_CLASSES } from "@governor/shared";
import { validateCondition } from "./conditions";

/**
 * FNV-1a 32-bit hash — fast, deterministic, no external deps.
 */
function fnv1a(data: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = (hash * 0x01000193) | 0;
  }
  return hash >>> 0;
}

export interface CompilationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checksum: string;
}

/**
 * Compile and validate a policy definition.
 * Returns errors for invalid structures, warnings for suspicious patterns,
 * and a checksum for version tracking.
 */
export function compilePolicy(definition: PolicyDefinition): CompilationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!definition.rules || definition.rules.length === 0) {
    errors.push("Policy must contain at least one rule");
  }

  const priorities = new Set<number>();
  for (let i = 0; i < (definition.rules?.length ?? 0); i++) {
    const rule = definition.rules[i];
    const prefix = `rules[${i}]`;

    if (!rule.reason_template || rule.reason_template.trim().length === 0) {
      errors.push(`${prefix}: reason_template is required`);
    }

    if (rule.priority < 0) {
      errors.push(`${prefix}: priority must be >= 0`);
    }

    if (priorities.has(rule.priority)) {
      warnings.push(`${prefix}: duplicate priority ${rule.priority} — evaluation order may be ambiguous`);
    }
    priorities.add(rule.priority);

    const validEffects = ["ALLOW", "DENY", "REQUIRE_APPROVAL"];
    if (!validEffects.includes(rule.effect)) {
      errors.push(`${prefix}: invalid effect "${rule.effect}"`);
    }

    const validSubjects = ["ORG", "AGENT", "TOOL", "RISK_CLASS", "USER", "ENVIRONMENT"];
    if (!validSubjects.includes(rule.subject_type)) {
      errors.push(`${prefix}: invalid subject_type "${rule.subject_type}"`);
    }

    if (rule.conditions) {
      const condErrors = validateCondition(rule.conditions);
      errors.push(...condErrors.map((e) => `${prefix}.conditions: ${e}`));
    }
  }

  // Check for rule conflicts: same subject_type + subject_value with opposing effects
  const ruleSignatures = new Map<string, { effect: string; index: number }[]>();
  for (let i = 0; i < (definition.rules?.length ?? 0); i++) {
    const rule = definition.rules[i];
    const sig = `${rule.subject_type}:${rule.subject_value ?? "*"}`;
    const existing = ruleSignatures.get(sig) ?? [];
    const hasConflict = existing.some(
      (e) => e.effect !== rule.effect && !rule.conditions && !definition.rules[e.index].conditions
    );
    if (hasConflict) {
      warnings.push(`rules[${i}]: potential conflict — same subject "${sig}" with opposing effect "${rule.effect}" and no distinguishing conditions`);
    }
    existing.push({ effect: rule.effect, index: i });
    ruleSignatures.set(sig, existing);
  }

  // Validate risk-class references
  const validRiskClasses = new Set(RISK_CLASSES);
  for (let i = 0; i < (definition.rules?.length ?? 0); i++) {
    const rule = definition.rules[i];
    if (rule.subject_type === "RISK_CLASS" && rule.subject_value) {
      if (!validRiskClasses.has(rule.subject_value as any)) {
        errors.push(`rules[${i}]: unknown risk class "${rule.subject_value}"`);
      }
    }
  }

  if (definition.budgets) {
    for (let i = 0; i < definition.budgets.length; i++) {
      const b = definition.budgets[i];
      if (b.limit_usd < 0) {
        errors.push(`budgets[${i}]: limit_usd must be >= 0`);
      }
      if (b.warn_at_usd != null && b.warn_at_usd >= b.limit_usd) {
        warnings.push(`budgets[${i}]: warn_at_usd (${b.warn_at_usd}) >= limit_usd (${b.limit_usd})`);
      }
    }
  }

  if (definition.rate_limits) {
    for (let i = 0; i < definition.rate_limits.length; i++) {
      const rl = definition.rate_limits[i];
      if (rl.max_calls < 1) {
        errors.push(`rate_limits[${i}]: max_calls must be >= 1`);
      }
      if (rl.window_seconds < 1) {
        errors.push(`rate_limits[${i}]: window_seconds must be >= 1`);
      }
    }
  }

  const checksum = generateChecksum(definition);

  return { valid: errors.length === 0, errors, warnings, checksum };
}

/**
 * Generate a 16-char deterministic checksum from a policy definition.
 * Uses dual FNV-1a hashes for better distribution.
 */
export function generateChecksum(definition: PolicyDefinition): string {
  const canonical = JSON.stringify(definition, Object.keys(definition).sort());
  const h1 = fnv1a(canonical).toString(16).padStart(8, "0");
  const h2 = fnv1a(canonical + "\x00" + canonical.length).toString(16).padStart(8, "0");
  return h1 + h2;
}

export interface PolicyDiffResult {
  rules_added: PolicyRuleDefinition[];
  rules_removed: PolicyRuleDefinition[];
  rules_modified: {
    before: PolicyRuleDefinition;
    after: PolicyRuleDefinition;
    changes: string[];
  }[];
  priority_changes: { rule_id: string; before: number; after: number }[];
  budget_changes: boolean;
  rate_limit_changes: boolean;
  approval_changes: boolean;
  summary: string;
}

/**
 * Compute a structured diff between two policy definitions.
 */
export function diffPolicyDefinitions(
  before: PolicyDefinition,
  after: PolicyDefinition,
): PolicyDiffResult {
  const beforeRules = before.rules ?? [];
  const afterRules = after.rules ?? [];

  function ruleKey(r: PolicyRuleDefinition): string {
    return r.id ?? `${r.subject_type}:${r.subject_value ?? "*"}:${r.effect}:${r.priority}`;
  }

  const beforeMap = new Map(beforeRules.map((r) => [ruleKey(r), r]));
  const afterMap = new Map(afterRules.map((r) => [ruleKey(r), r]));

  const added: PolicyRuleDefinition[] = [];
  const removed: PolicyRuleDefinition[] = [];
  const modified: PolicyDiffResult["rules_modified"] = [];
  const priorityChanges: PolicyDiffResult["priority_changes"] = [];

  for (const [key, rule] of afterMap) {
    if (!beforeMap.has(key)) {
      added.push(rule);
    }
  }

  for (const [key, rule] of beforeMap) {
    if (!afterMap.has(key)) {
      removed.push(rule);
    } else {
      const afterRule = afterMap.get(key)!;
      const changes: string[] = [];

      if (rule.effect !== afterRule.effect) changes.push(`effect: ${rule.effect} → ${afterRule.effect}`);
      if (rule.priority !== afterRule.priority) {
        changes.push(`priority: ${rule.priority} → ${afterRule.priority}`);
        priorityChanges.push({ rule_id: key, before: rule.priority, after: afterRule.priority });
      }
      if (rule.reason_template !== afterRule.reason_template) changes.push("reason_template changed");
      if (JSON.stringify(rule.conditions) !== JSON.stringify(afterRule.conditions)) changes.push("conditions changed");
      if (rule.subject_value !== afterRule.subject_value) changes.push(`subject_value: ${rule.subject_value} → ${afterRule.subject_value}`);

      if (changes.length > 0) {
        modified.push({ before: rule, after: afterRule, changes });
      }
    }
  }

  const budgetChanges = JSON.stringify(before.budgets) !== JSON.stringify(after.budgets);
  const rateLimitChanges = JSON.stringify(before.rate_limits) !== JSON.stringify(after.rate_limits);
  const approvalChanges = JSON.stringify(before.approval_requirements) !== JSON.stringify(after.approval_requirements);

  const parts: string[] = [];
  if (added.length) parts.push(`${added.length} rule(s) added`);
  if (removed.length) parts.push(`${removed.length} rule(s) removed`);
  if (modified.length) parts.push(`${modified.length} rule(s) modified`);
  if (budgetChanges) parts.push("budget changes");
  if (rateLimitChanges) parts.push("rate limit changes");
  if (approvalChanges) parts.push("approval requirement changes");

  return {
    rules_added: added,
    rules_removed: removed,
    rules_modified: modified,
    priority_changes: priorityChanges,
    budget_changes: budgetChanges,
    rate_limit_changes: rateLimitChanges,
    approval_changes: approvalChanges,
    summary: parts.length > 0 ? parts.join(", ") : "No changes",
  };
}
