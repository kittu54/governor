import type { Condition, LeafCondition } from "@governor/shared";

/**
 * Resolve a dotted field path against a facts object.
 * e.g. "context.tool_name" against { context: { tool_name: "stripe" } } → "stripe"
 */
function resolveField(facts: Record<string, unknown>, field: string): unknown {
  const parts = field.split(".");
  let current: unknown = facts;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function evaluateLeaf(condition: LeafCondition, facts: Record<string, unknown>): boolean {
  const actual = resolveField(facts, condition.field);
  const expected = condition.value;

  switch (condition.operator) {
    case "equals":
      return actual === expected;

    case "not_equals":
      return actual !== expected;

    case "in":
      if (!Array.isArray(expected)) return false;
      return expected.includes(actual);

    case "not_in":
      if (!Array.isArray(expected)) return true;
      return !expected.includes(actual);

    case "greater_than":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;

    case "less_than":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;

    case "greater_than_or_equal":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;

    case "less_than_or_equal":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;

    case "contains":
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.includes(expected);
      }
      if (Array.isArray(actual)) {
        return actual.includes(expected);
      }
      return false;

    case "not_contains":
      if (typeof actual === "string" && typeof expected === "string") {
        return !actual.includes(expected);
      }
      if (Array.isArray(actual)) {
        return !actual.includes(expected);
      }
      return true;

    case "regex":
      if (typeof actual !== "string" || typeof expected !== "string") return false;
      try {
        return new RegExp(expected).test(actual);
      } catch {
        return false;
      }

    case "exists":
      return actual !== undefined && actual !== null;

    case "not_exists":
      return actual === undefined || actual === null;

    default:
      return false;
  }
}

function isLeafCondition(c: Condition): c is LeafCondition {
  return "field" in c && "operator" in c;
}

export function evaluateCondition(condition: Condition, facts: Record<string, unknown>): boolean {
  if (isLeafCondition(condition)) {
    return evaluateLeaf(condition, facts);
  }

  if ("and" in condition) {
    return condition.and.every((c) => evaluateCondition(c, facts));
  }

  if ("or" in condition) {
    return condition.or.some((c) => evaluateCondition(c, facts));
  }

  if ("not" in condition) {
    return !evaluateCondition(condition.not, facts);
  }

  return false;
}

/**
 * Validate a condition tree structure (for policy compilation).
 * Returns an array of error messages; empty means valid.
 */
export function validateCondition(condition: unknown, path = "root"): string[] {
  const errors: string[] = [];

  if (condition == null || typeof condition !== "object") {
    errors.push(`${path}: condition must be an object`);
    return errors;
  }

  const c = condition as Record<string, unknown>;

  if ("field" in c && "operator" in c) {
    if (typeof c.field !== "string" || c.field.length === 0) {
      errors.push(`${path}: field must be a non-empty string`);
    }
    const validOps = [
      "equals", "not_equals", "in", "not_in",
      "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal",
      "contains", "not_contains", "regex", "exists", "not_exists",
    ];
    if (!validOps.includes(c.operator as string)) {
      errors.push(`${path}: invalid operator "${c.operator}"`);
    }
    return errors;
  }

  if ("and" in c) {
    if (!Array.isArray(c.and)) {
      errors.push(`${path}.and: must be an array`);
    } else {
      c.and.forEach((child, i) => errors.push(...validateCondition(child, `${path}.and[${i}]`)));
    }
    return errors;
  }

  if ("or" in c) {
    if (!Array.isArray(c.or)) {
      errors.push(`${path}.or: must be an array`);
    } else {
      c.or.forEach((child, i) => errors.push(...validateCondition(child, `${path}.or[${i}]`)));
    }
    return errors;
  }

  if ("not" in c) {
    errors.push(...validateCondition(c.not, `${path}.not`));
    return errors;
  }

  errors.push(`${path}: unrecognized condition shape`);
  return errors;
}
