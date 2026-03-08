import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../src/evaluate";
import { explain } from "../src/explain";
import { evaluateCondition, validateCondition } from "../src/conditions";
import { compilePolicy } from "../src/compile";
import type { PolicyEvaluationInput, Condition, PolicyDefinition } from "@governor/shared";

function baseInput(overrides?: Partial<PolicyEvaluationInput>): PolicyEvaluationInput {
  return {
    context: {
      org_id: "org_1",
      agent_id: "agent_1",
      tool_name: "stripe",
      tool_action: "refund",
      cost_estimate_usd: 10,
      environment: "DEV",
      risk_class: "MONEY_MOVEMENT",
      is_sensitive: true,
      timestamp: new Date().toISOString(),
    },
    rules: [],
    thresholds: [],
    budgets: {
      usage: {
        org_spend_today_usd: 100,
        agent_spend_today_usd: 20,
      },
    },
    rate_limits: {
      current_calls: 0,
    },
    ...overrides,
  };
}

function withContext(ctx: Partial<PolicyEvaluationInput["context"]>): Partial<PolicyEvaluationInput> {
  return {
    context: {
      org_id: "org_1",
      agent_id: "agent_1",
      tool_name: "stripe",
      tool_action: "refund",
      cost_estimate_usd: 10,
      environment: "DEV",
      risk_class: "MONEY_MOVEMENT",
      is_sensitive: true,
      timestamp: new Date().toISOString(),
      ...ctx,
    },
  };
}

describe("evaluatePolicy", () => {
  // ─── Basic Rules ──────────────────────────────────────────
  it("denies when deny rule matches", () => {
    const result = evaluatePolicy(
      baseInput({
        rules: [
          { id: "r1", org_id: "org_1", agent_id: "*", tool_name: "stripe", tool_action: "refund", effect: "DENY", priority: 1 },
        ],
      })
    );
    expect(result.decision).toBe("DENY");
    expect(result.matched_rule_ids).toContain("r1");
  });

  it("allows when allow rule matches", () => {
    const result = evaluatePolicy(
      baseInput({
        rules: [
          { id: "r1", org_id: "org_1", agent_id: "*", tool_name: "stripe", tool_action: "refund", effect: "ALLOW", priority: 1 },
        ],
      })
    );
    expect(result.decision).toBe("ALLOW");
  });

  it("deny rule takes priority over allow rule at same priority", () => {
    const result = evaluatePolicy(
      baseInput({
        rules: [
          { id: "allow1", org_id: "org_1", agent_id: "*", tool_name: "stripe", tool_action: "refund", effect: "ALLOW", priority: 1 },
          { id: "deny1", org_id: "org_1", agent_id: "*", tool_name: "stripe", tool_action: "refund", effect: "DENY", priority: 1 },
        ],
      })
    );
    expect(result.decision).toBe("DENY");
  });

  it("non-matching rules do not affect decision", () => {
    const result = evaluatePolicy(
      baseInput({
        rules: [
          { id: "deny1", org_id: "org_1", agent_id: "*", tool_name: "github", tool_action: "delete", effect: "DENY", priority: 1 },
        ],
      })
    );
    expect(result.decision).toBe("ALLOW");
    expect(result.matched_rule_ids).not.toContain("deny1");
  });

  it("supports wildcard rules", () => {
    const result = evaluatePolicy(
      baseInput({
        rules: [
          { id: "r1", org_id: "org_1", agent_id: "*", tool_name: "http", tool_action: "*", effect: "ALLOW", priority: 10 },
        ],
        ...withContext({ tool_name: "http", tool_action: "GET", risk_class: "LOW_RISK", is_sensitive: false }),
      })
    );
    expect(result.decision).toBe("ALLOW");
  });

  // ─── Budget Checks ────────────────────────────────────────
  it("denies when org budget is exceeded", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ cost_estimate_usd: 50 }),
        budgets: {
          org: { id: "ob1", org_id: "org_1", daily_limit_usd: 120 },
          usage: { org_spend_today_usd: 100, agent_spend_today_usd: 0 },
        },
      })
    );
    expect(result.decision).toBe("DENY");
    expect(result.reason).toContain("Organization daily budget exceeded");
  });

  it("denies when agent budget is exceeded", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ cost_estimate_usd: 30 }),
        budgets: {
          agent: { id: "b1", org_id: "org_1", agent_id: "agent_1", daily_limit_usd: 40 },
          usage: { org_spend_today_usd: 100, agent_spend_today_usd: 20 },
        },
      })
    );
    expect(result.decision).toBe("DENY");
    expect(result.reason).toContain("Agent daily budget exceeded");
  });

  it("allows when cost is exactly at budget limit", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ cost_estimate_usd: 20 }),
        budgets: {
          agent: { id: "b1", org_id: "org_1", agent_id: "agent_1", daily_limit_usd: 40 },
          usage: { org_spend_today_usd: 100, agent_spend_today_usd: 20 },
        },
      })
    );
    expect(result.decision).toBe("ALLOW");
  });

  it("budget check runs before deny rules", () => {
    const result = evaluatePolicy(
      baseInput({
        rules: [
          { id: "deny1", org_id: "org_1", agent_id: "*", tool_name: "stripe", tool_action: "refund", effect: "DENY", priority: 1 },
        ],
        budgets: {
          org: { id: "ob1", org_id: "org_1", daily_limit_usd: 50 },
          usage: { org_spend_today_usd: 100, agent_spend_today_usd: 0 },
        },
      })
    );
    expect(result.decision).toBe("DENY");
    expect(result.reason).toContain("Organization daily budget exceeded");
  });

  // ─── Rate Limit Checks ────────────────────────────────────
  it("denies on rate limit exceeded", () => {
    const result = evaluatePolicy(
      baseInput({
        rate_limits: {
          policy: { id: "rl1", org_id: "org_1", calls_per_minute: 2 },
          current_calls: 2,
        },
      })
    );
    expect(result.decision).toBe("DENY");
    expect(result.reason).toContain("Rate limit exceeded");
  });

  it("allows when rate limit calls are below limit", () => {
    const result = evaluatePolicy(
      baseInput({
        rate_limits: {
          policy: { id: "rl1", org_id: "org_1", calls_per_minute: 5 },
          current_calls: 4,
        },
      })
    );
    expect(result.decision).toBe("ALLOW");
  });

  // ─── Approval Thresholds ──────────────────────────────────
  it("requires approval when threshold is exceeded", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ cost_estimate_usd: 75 }),
        thresholds: [
          { id: "t1", org_id: "org_1", tool_name: "stripe", tool_action: "refund", amount_usd: 50 },
        ],
      })
    );
    expect(result.decision).toBe("REQUIRE_APPROVAL");
  });

  it("allows when cost is exactly at threshold", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ cost_estimate_usd: 50 }),
        thresholds: [
          { id: "t1", org_id: "org_1", tool_name: "stripe", tool_action: "refund", amount_usd: 50 },
        ],
      })
    );
    expect(result.decision).toBe("ALLOW");
  });

  it("matches approval thresholds by risk class", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ cost_estimate_usd: 5, risk_class: "MONEY_MOVEMENT" }),
        thresholds: [
          { id: "t1", org_id: "org_1", tool_name: "*", tool_action: "*", amount_usd: 1, risk_class: "MONEY_MOVEMENT" },
        ],
      })
    );
    expect(result.decision).toBe("REQUIRE_APPROVAL");
  });

  it("does not match threshold for wrong risk class", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ cost_estimate_usd: 5, risk_class: "LOW_RISK", is_sensitive: false }),
        thresholds: [
          { id: "t1", org_id: "org_1", tool_name: "*", tool_action: "*", amount_usd: 1, risk_class: "MONEY_MOVEMENT" },
        ],
      })
    );
    expect(result.decision).toBe("ALLOW");
  });

  // ─── Approval Policies ────────────────────────────────────
  it("requires approval when approval policy matches by risk class", () => {
    const result = evaluatePolicy(
      baseInput({
        approval_policies: [
          { risk_class: "MONEY_MOVEMENT", requires_reason: true, auto_expire_seconds: 3600 },
        ],
      })
    );
    expect(result.decision).toBe("REQUIRE_APPROVAL");
  });

  it("does not trigger approval policy for wrong risk class", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ risk_class: "LOW_RISK", is_sensitive: false }),
        approval_policies: [
          { risk_class: "MONEY_MOVEMENT", requires_reason: true, auto_expire_seconds: 3600 },
        ],
      })
    );
    expect(result.decision).toBe("ALLOW");
  });

  // ─── Enforcement Mode Defaults ────────────────────────────
  it("default ALLOW in DEV mode for sensitive actions", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ environment: "DEV", risk_class: "CODE_EXECUTION", is_sensitive: true }),
      })
    );
    expect(result.decision).toBe("ALLOW");
    expect(result.enforcement_mode).toBe("DEV");
  });

  it("default ALLOW with warning in STAGING for sensitive actions", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ environment: "STAGING", risk_class: "CODE_EXECUTION", is_sensitive: true }),
      })
    );
    expect(result.decision).toBe("ALLOW");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("would be DENIED in PROD");
  });

  it("default DENY in PROD for sensitive actions", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ environment: "PROD", risk_class: "CODE_EXECUTION", is_sensitive: true }),
      })
    );
    expect(result.decision).toBe("DENY");
    expect(result.reason).toContain("Default DENY in PROD");
  });

  it("default ALLOW in PROD for non-sensitive actions", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ environment: "PROD", risk_class: "LOW_RISK", is_sensitive: false }),
      })
    );
    expect(result.decision).toBe("ALLOW");
  });

  it("explicit ALLOW rule overrides PROD default deny for sensitive", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ environment: "PROD", risk_class: "MONEY_MOVEMENT", is_sensitive: true }),
        rules: [
          { id: "r1", org_id: "org_1", agent_id: "*", tool_name: "stripe", tool_action: "refund", effect: "ALLOW", priority: 1 },
        ],
      })
    );
    expect(result.decision).toBe("ALLOW");
  });

  // ─── Conditions ───────────────────────────────────────────
  it("evaluates rule with condition", () => {
    const result = evaluatePolicy(
      baseInput({
        rules: [
          {
            id: "r1", org_id: "org_1", agent_id: "*", tool_name: "stripe", tool_action: "refund",
            effect: "DENY", priority: 1,
            conditions: { field: "cost_estimate_usd", operator: "greater_than", value: 5 },
          },
        ],
      })
    );
    expect(result.decision).toBe("DENY");
  });

  it("skips rule when condition does not match", () => {
    const result = evaluatePolicy(
      baseInput({
        rules: [
          {
            id: "r1", org_id: "org_1", agent_id: "*", tool_name: "stripe", tool_action: "refund",
            effect: "DENY", priority: 1,
            conditions: { field: "cost_estimate_usd", operator: "greater_than", value: 100 },
          },
        ],
      })
    );
    expect(result.decision).toBe("ALLOW");
  });

  it("evaluates AND conditions", () => {
    const result = evaluatePolicy(
      baseInput({
        rules: [
          {
            id: "r1", org_id: "org_1", agent_id: "*", tool_name: "stripe", tool_action: "refund",
            effect: "DENY", priority: 1,
            conditions: {
              and: [
                { field: "cost_estimate_usd", operator: "greater_than", value: 5 },
                { field: "environment", operator: "equals", value: "DEV" },
              ],
            },
          },
        ],
      })
    );
    expect(result.decision).toBe("DENY");
  });

  it("evaluates OR conditions", () => {
    const result = evaluatePolicy(
      baseInput({
        rules: [
          {
            id: "r1", org_id: "org_1", agent_id: "*", tool_name: "stripe", tool_action: "refund",
            effect: "DENY", priority: 1,
            conditions: {
              or: [
                { field: "environment", operator: "equals", value: "PROD" },
                { field: "cost_estimate_usd", operator: "greater_than", value: 5 },
              ],
            },
          },
        ],
      })
    );
    expect(result.decision).toBe("DENY");
  });

  it("evaluates NOT conditions", () => {
    const result = evaluatePolicy(
      baseInput({
        rules: [
          {
            id: "r1", org_id: "org_1", agent_id: "*", tool_name: "stripe", tool_action: "refund",
            effect: "DENY", priority: 1,
            conditions: {
              not: { field: "environment", operator: "equals", value: "PROD" },
            },
          },
        ],
      })
    );
    expect(result.decision).toBe("DENY");
  });

  it("evaluates risk_class-scoped rules", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ risk_class: "DATA_EXPORT" }),
        rules: [
          { id: "r1", org_id: "org_1", tool_name: "*", tool_action: "*", effect: "DENY", priority: 1, risk_class: "DATA_EXPORT" },
        ],
      })
    );
    expect(result.decision).toBe("DENY");
  });

  it("skips risk_class-scoped rule for non-matching class", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ risk_class: "LOW_RISK", is_sensitive: false }),
        rules: [
          { id: "r1", org_id: "org_1", tool_name: "*", tool_action: "*", effect: "DENY", priority: 1, risk_class: "DATA_EXPORT" },
        ],
      })
    );
    expect(result.decision).toBe("ALLOW");
  });

  // ─── Result Structure ─────────────────────────────────────
  it("includes budget_snapshot in result", () => {
    const result = evaluatePolicy(baseInput());
    expect(result.budget_snapshot).toBeDefined();
    expect(result.budget_snapshot.org_spend_today_usd).toBe(100);
    expect(result.budget_snapshot.cost_estimate_usd).toBe(10);
  });

  it("includes enforcement_mode and risk_class in result", () => {
    const result = evaluatePolicy(baseInput());
    expect(result.enforcement_mode).toBe("DEV");
    expect(result.risk_class).toBe("MONEY_MOVEMENT");
  });

  it("includes normalized_facts in result", () => {
    const result = evaluatePolicy(baseInput());
    expect(result.normalized_facts).toBeDefined();
    expect(result.normalized_facts.org_id).toBe("org_1");
    expect(result.normalized_facts.tool_name).toBe("stripe");
  });

  it("includes reason in result", () => {
    const result = evaluatePolicy(baseInput());
    expect(result.reason).toBeDefined();
    expect(typeof result.reason).toBe("string");
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it("returns warnings for DEV mode with sensitive actions", () => {
    const result = evaluatePolicy(baseInput());
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("DEV notice");
    expect(result.warnings[0]).toContain("would be DENIED in PROD");
  });

  it("returns empty warnings for DEV mode with non-sensitive actions", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ risk_class: "LOW_RISK", is_sensitive: false }),
      })
    );
    expect(result.warnings).toEqual([]);
  });

  // ─── is_sensitive / would_deny_in_prod Fields ──────────────
  it("sets is_sensitive=true for sensitive risk classes", () => {
    const result = evaluatePolicy(baseInput());
    expect(result.is_sensitive).toBe(true);
  });

  it("sets is_sensitive=false for LOW_RISK", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ risk_class: "LOW_RISK", is_sensitive: false }),
      })
    );
    expect(result.is_sensitive).toBe(false);
  });

  it("sets would_deny_in_prod=true in DEV for sensitive actions without ALLOW rule", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ environment: "DEV", risk_class: "CODE_EXECUTION", is_sensitive: true }),
      })
    );
    expect(result.decision).toBe("ALLOW");
    expect(result.would_deny_in_prod).toBe(true);
  });

  it("sets would_deny_in_prod=true in STAGING for sensitive actions without ALLOW rule", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ environment: "STAGING", risk_class: "MONEY_MOVEMENT", is_sensitive: true }),
      })
    );
    expect(result.decision).toBe("ALLOW");
    expect(result.would_deny_in_prod).toBe(true);
  });

  it("sets would_deny_in_prod=false for non-sensitive actions", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ environment: "DEV", risk_class: "LOW_RISK", is_sensitive: false }),
      })
    );
    expect(result.would_deny_in_prod).toBe(false);
  });

  it("sets would_deny_in_prod=false when explicit ALLOW rule exists (DEV)", () => {
    const result = evaluatePolicy(
      baseInput({
        ...withContext({ environment: "DEV", risk_class: "CODE_EXECUTION", is_sensitive: true }),
        rules: [
          { id: "r1", org_id: "org_1", agent_id: "*", tool_name: "stripe", tool_action: "refund", effect: "ALLOW", priority: 1 },
        ],
      })
    );
    expect(result.decision).toBe("ALLOW");
    expect(result.would_deny_in_prod).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// Conditions DSL
// ──────────────────────────────────────────────────────────────

describe("evaluateCondition", () => {
  const facts = {
    org_id: "org_1",
    agent_id: "agent_1",
    cost_estimate_usd: 50,
    tool_name: "stripe",
    environment: "PROD",
    tags: ["vip", "internal"],
    nested: { value: 42 },
  };

  it("equals", () => {
    expect(evaluateCondition({ field: "org_id", operator: "equals", value: "org_1" }, facts)).toBe(true);
    expect(evaluateCondition({ field: "org_id", operator: "equals", value: "org_2" }, facts)).toBe(false);
  });

  it("not_equals", () => {
    expect(evaluateCondition({ field: "org_id", operator: "not_equals", value: "org_2" }, facts)).toBe(true);
  });

  it("in", () => {
    expect(evaluateCondition({ field: "environment", operator: "in", value: ["DEV", "PROD"] }, facts)).toBe(true);
    expect(evaluateCondition({ field: "environment", operator: "in", value: ["DEV", "STAGING"] }, facts)).toBe(false);
  });

  it("not_in", () => {
    expect(evaluateCondition({ field: "environment", operator: "not_in", value: ["DEV", "STAGING"] }, facts)).toBe(true);
  });

  it("greater_than / less_than", () => {
    expect(evaluateCondition({ field: "cost_estimate_usd", operator: "greater_than", value: 10 }, facts)).toBe(true);
    expect(evaluateCondition({ field: "cost_estimate_usd", operator: "less_than", value: 100 }, facts)).toBe(true);
    expect(evaluateCondition({ field: "cost_estimate_usd", operator: "greater_than", value: 50 }, facts)).toBe(false);
  });

  it("greater_than_or_equal / less_than_or_equal", () => {
    expect(evaluateCondition({ field: "cost_estimate_usd", operator: "greater_than_or_equal", value: 50 }, facts)).toBe(true);
    expect(evaluateCondition({ field: "cost_estimate_usd", operator: "less_than_or_equal", value: 50 }, facts)).toBe(true);
  });

  it("contains", () => {
    expect(evaluateCondition({ field: "tool_name", operator: "contains", value: "trip" }, facts)).toBe(true);
    expect(evaluateCondition({ field: "tags", operator: "contains", value: "vip" }, facts)).toBe(true);
  });

  it("not_contains", () => {
    expect(evaluateCondition({ field: "tool_name", operator: "not_contains", value: "github" }, facts)).toBe(true);
  });

  it("regex", () => {
    expect(evaluateCondition({ field: "tool_name", operator: "regex", value: "^str.*" }, facts)).toBe(true);
    expect(evaluateCondition({ field: "tool_name", operator: "regex", value: "^github" }, facts)).toBe(false);
  });

  it("exists / not_exists", () => {
    expect(evaluateCondition({ field: "org_id", operator: "exists", value: null }, facts)).toBe(true);
    expect(evaluateCondition({ field: "missing_field", operator: "exists", value: null }, facts)).toBe(false);
    expect(evaluateCondition({ field: "missing_field", operator: "not_exists", value: null }, facts)).toBe(true);
  });

  it("nested field resolution", () => {
    expect(evaluateCondition({ field: "nested.value", operator: "equals", value: 42 }, facts)).toBe(true);
  });

  it("AND combinator", () => {
    const cond: Condition = {
      and: [
        { field: "environment", operator: "equals", value: "PROD" },
        { field: "cost_estimate_usd", operator: "greater_than", value: 10 },
      ],
    };
    expect(evaluateCondition(cond, facts)).toBe(true);
  });

  it("OR combinator", () => {
    const cond: Condition = {
      or: [
        { field: "environment", operator: "equals", value: "DEV" },
        { field: "cost_estimate_usd", operator: "greater_than", value: 10 },
      ],
    };
    expect(evaluateCondition(cond, facts)).toBe(true);
  });

  it("NOT combinator", () => {
    const cond: Condition = {
      not: { field: "environment", operator: "equals", value: "DEV" },
    };
    expect(evaluateCondition(cond, facts)).toBe(true);
  });

  it("deeply nested combinators", () => {
    const cond: Condition = {
      and: [
        { or: [
          { field: "environment", operator: "equals", value: "PROD" },
          { field: "environment", operator: "equals", value: "STAGING" },
        ]},
        { not: { field: "cost_estimate_usd", operator: "less_than", value: 10 } },
      ],
    };
    expect(evaluateCondition(cond, facts)).toBe(true);
  });
});

describe("validateCondition", () => {
  it("valid leaf condition", () => {
    expect(validateCondition({ field: "x", operator: "equals", value: 1 })).toEqual([]);
  });

  it("rejects invalid operator", () => {
    const errors = validateCondition({ field: "x", operator: "bad_op", value: 1 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects empty field", () => {
    const errors = validateCondition({ field: "", operator: "equals", value: 1 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("validates nested conditions", () => {
    const errors = validateCondition({
      and: [
        { field: "x", operator: "equals", value: 1 },
        { field: "", operator: "bad", value: 2 },
      ],
    });
    expect(errors.length).toBe(2);
  });

  it("rejects unrecognized shapes", () => {
    const errors = validateCondition({ foo: "bar" });
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────────────
// Policy Compilation
// ──────────────────────────────────────────────────────────────

describe("compilePolicy", () => {
  const validDefinition: PolicyDefinition = {
    rules: [
      {
        priority: 1,
        effect: "DENY",
        subject_type: "TOOL",
        subject_value: "stripe.refund",
        reason_template: "Block all refunds",
      },
    ],
  };

  it("validates a correct definition", () => {
    const result = compilePolicy(validDefinition);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.checksum).toBeTruthy();
  });

  it("rejects empty rules", () => {
    const result = compilePolicy({ rules: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Policy must contain at least one rule");
  });

  it("rejects missing reason_template", () => {
    const result = compilePolicy({
      rules: [{ priority: 1, effect: "DENY", subject_type: "TOOL", reason_template: "" }],
    });
    expect(result.valid).toBe(false);
  });

  it("warns on duplicate priorities", () => {
    const result = compilePolicy({
      rules: [
        { priority: 1, effect: "DENY", subject_type: "TOOL", reason_template: "a" },
        { priority: 1, effect: "ALLOW", subject_type: "TOOL", reason_template: "b" },
      ],
    });
    expect(result.warnings.some((w) => w.includes("duplicate priority"))).toBe(true);
  });

  it("generates consistent checksum for same definition", () => {
    const r1 = compilePolicy(validDefinition);
    const r2 = compilePolicy(validDefinition);
    expect(r1.checksum).toBe(r2.checksum);
  });

  it("validates budget constraints", () => {
    const result = compilePolicy({
      rules: [{ priority: 1, effect: "DENY", subject_type: "TOOL", reason_template: "x" }],
      budgets: [{ scope_type: "ORG", period: "DAILY", limit_usd: -10, hard_stop: true }],
    });
    expect(result.valid).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// Explain
// ──────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────
// Enforcement Mode Consistency (per risk class)
// ──────────────────────────────────────────────────────────────

describe("enforcement mode consistency per risk class", () => {
  const sensitiveClasses = [
    "MONEY_MOVEMENT",
    "DATA_EXPORT",
    "CODE_EXECUTION",
    "FILE_MUTATION",
    "ADMIN_ACTION",
    "CREDENTIAL_USE",
    "PII_ACCESS",
    "EXTERNAL_COMMUNICATION",
  ] as const;

  for (const rc of sensitiveClasses) {
    describe(`risk class: ${rc}`, () => {
      it("DEV: allows sensitive action with would_deny_in_prod=true", () => {
        const result = evaluatePolicy(
          baseInput({
            ...withContext({ environment: "DEV", risk_class: rc, is_sensitive: true, tool_name: "test", tool_action: "op" }),
          })
        );
        expect(result.decision).toBe("ALLOW");
        expect(result.would_deny_in_prod).toBe(true);
        expect(result.is_sensitive).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.trace.some((t) => t.code === "DEV_PROD_PREVIEW")).toBe(true);
      });

      it("STAGING: allows sensitive action with would_deny_in_prod=true and warning", () => {
        const result = evaluatePolicy(
          baseInput({
            ...withContext({ environment: "STAGING", risk_class: rc, is_sensitive: true, tool_name: "test", tool_action: "op" }),
          })
        );
        expect(result.decision).toBe("ALLOW");
        expect(result.would_deny_in_prod).toBe(true);
        expect(result.warnings.some((w) => w.includes("would be DENIED in PROD"))).toBe(true);
        expect(result.trace.some((t) => t.code === "STAGING_PROD_PREVIEW")).toBe(true);
      });

      it("PROD: denies sensitive action by default", () => {
        const result = evaluatePolicy(
          baseInput({
            ...withContext({ environment: "PROD", risk_class: rc, is_sensitive: true, tool_name: "test", tool_action: "op" }),
          })
        );
        expect(result.decision).toBe("DENY");
        expect(result.reason).toContain("Default DENY in PROD");
        expect(result.is_sensitive).toBe(true);
      });

      it("PROD: explicit ALLOW rule overrides default deny", () => {
        const result = evaluatePolicy(
          baseInput({
            ...withContext({ environment: "PROD", risk_class: rc, is_sensitive: true, tool_name: "test", tool_action: "op" }),
            rules: [
              { id: "allow-override", org_id: "org_1", agent_id: "*", tool_name: "test", tool_action: "op", effect: "ALLOW", priority: 1, reason: "Explicit allow" },
            ],
          })
        );
        expect(result.decision).toBe("ALLOW");
        expect(result.matched_rule_ids).toContain("allow-override");
      });

      it("PROD: approval can override default deny", () => {
        const result = evaluatePolicy(
          baseInput({
            ...withContext({ environment: "PROD", risk_class: rc, is_sensitive: true, tool_name: "test", tool_action: "op" }),
            approval_policies: [
              { risk_class: rc, requires_reason: true, auto_expire_seconds: 3600 },
            ],
          })
        );
        expect(result.decision).toBe("REQUIRE_APPROVAL");
      });
    });
  }

  it("LOW_RISK is allowed in all modes without warnings", () => {
    for (const env of ["DEV", "STAGING", "PROD"] as const) {
      const result = evaluatePolicy(
        baseInput({
          ...withContext({ environment: env, risk_class: "LOW_RISK", is_sensitive: false, tool_name: "read", tool_action: "get" }),
        })
      );
      expect(result.decision).toBe("ALLOW");
      expect(result.would_deny_in_prod).toBe(false);
      expect(result.is_sensitive).toBe(false);
    }
  });

  it("budget deny takes precedence over environment mode in all modes", () => {
    for (const env of ["DEV", "STAGING", "PROD"] as const) {
      const result = evaluatePolicy(
        baseInput({
          ...withContext({ environment: env, cost_estimate_usd: 200 }),
          budgets: {
            org: { id: "ob1", org_id: "org_1", daily_limit_usd: 100 },
            usage: { org_spend_today_usd: 50, agent_spend_today_usd: 0 },
          },
        })
      );
      expect(result.decision).toBe("DENY");
      expect(result.reason).toContain("budget exceeded");
    }
  });

  it("rate limit deny takes precedence over environment mode in all modes", () => {
    for (const env of ["DEV", "STAGING", "PROD"] as const) {
      const result = evaluatePolicy(
        baseInput({
          ...withContext({ environment: env }),
          rate_limits: {
            policy: { id: "rl1", org_id: "org_1", calls_per_minute: 1 },
            current_calls: 5,
          },
        })
      );
      expect(result.decision).toBe("DENY");
      expect(result.reason).toContain("Rate limit exceeded");
    }
  });

  it("explicit DENY rule takes precedence in all modes", () => {
    for (const env of ["DEV", "STAGING", "PROD"] as const) {
      const result = evaluatePolicy(
        baseInput({
          ...withContext({ environment: env, risk_class: "LOW_RISK", is_sensitive: false }),
          rules: [
            { id: "deny-all", org_id: "org_1", agent_id: "*", tool_name: "stripe", tool_action: "refund", effect: "DENY", priority: 1, reason: "Blocked" },
          ],
        })
      );
      expect(result.decision).toBe("DENY");
    }
  });
});

describe("explain", () => {
  it("returns human-readable explanation", () => {
    const { result, explanation } = explain(baseInput());
    expect(result.decision).toBe("ALLOW");
    expect(explanation.length).toBeGreaterThan(0);
    expect(explanation.some((l) => l.includes("Decision"))).toBe(true);
    expect(explanation.some((l) => l.includes("Risk Class"))).toBe(true);
    expect(explanation.some((l) => l.includes("Evaluation Trace"))).toBe(true);
  });

  it("includes warnings in STAGING explain", () => {
    const { explanation } = explain(
      baseInput({
        ...withContext({ environment: "STAGING", risk_class: "CODE_EXECUTION", is_sensitive: true }),
      })
    );
    expect(explanation.some((l) => l.includes("Warnings"))).toBe(true);
  });

  it("shows would_deny_in_prod notice in DEV explain for sensitive actions", () => {
    const { result, explanation } = explain(baseInput());
    expect(result.would_deny_in_prod).toBe(true);
    expect(explanation.some((l) => l.includes("Would Deny in PROD"))).toBe(true);
  });

  it("does not show would_deny_in_prod for non-sensitive actions", () => {
    const { result, explanation } = explain(
      baseInput({
        ...withContext({ risk_class: "LOW_RISK", is_sensitive: false }),
      })
    );
    expect(result.would_deny_in_prod).toBe(false);
    expect(explanation.some((l) => l.includes("Would Deny in PROD"))).toBe(false);
  });
});
