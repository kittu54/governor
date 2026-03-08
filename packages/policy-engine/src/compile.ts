import type { PolicyDefinition } from "@governor/shared";
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
