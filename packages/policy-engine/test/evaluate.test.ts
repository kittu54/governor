import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../src/evaluate";
import type { PolicyEvaluationInput } from "@governor/shared";

function baseInput(overrides?: Partial<PolicyEvaluationInput>): PolicyEvaluationInput {
  return {
    context: {
      org_id: "org_1",
      agent_id: "agent_1",
      tool_name: "stripe",
      tool_action: "refund",
      cost_estimate_usd: 10,
      timestamp: new Date().toISOString()
    },
    rules: [],
    thresholds: [],
    budgets: {
      usage: {
        org_spend_today_usd: 100,
        agent_spend_today_usd: 20
      }
    },
    rate_limits: {
      current_calls: 0
    },
    ...overrides
  };
}

describe("evaluatePolicy", () => {
  it("denies when deny rule matches", () => {
    const result = evaluatePolicy(
      baseInput({
        rules: [
          {
            id: "r1",
            org_id: "org_1",
            agent_id: "*",
            tool_name: "stripe",
            tool_action: "refund",
            effect: "DENY",
            priority: 1
          }
        ]
      })
    );

    expect(result.decision).toBe("DENY");
    expect(result.matched_rule_ids).toContain("r1");
  });

  it("requires approval when threshold is exceeded", () => {
    const result = evaluatePolicy(
      baseInput({
        context: {
          org_id: "org_1",
          agent_id: "agent_1",
          tool_name: "stripe",
          tool_action: "refund",
          cost_estimate_usd: 75,
          timestamp: new Date().toISOString()
        },
        thresholds: [
          {
            id: "t1",
            org_id: "org_1",
            tool_name: "stripe",
            tool_action: "refund",
            amount_usd: 50
          }
        ]
      })
    );

    expect(result.decision).toBe("REQUIRE_APPROVAL");
  });

  it("denies when agent budget is exceeded", () => {
    const result = evaluatePolicy(
      baseInput({
        context: {
          org_id: "org_1",
          agent_id: "agent_1",
          tool_name: "stripe",
          tool_action: "refund",
          cost_estimate_usd: 30,
          timestamp: new Date().toISOString()
        },
        budgets: {
          agent: {
            id: "b1",
            org_id: "org_1",
            agent_id: "agent_1",
            daily_limit_usd: 40
          },
          usage: {
            org_spend_today_usd: 100,
            agent_spend_today_usd: 20
          }
        }
      })
    );

    expect(result.decision).toBe("DENY");
    expect(result.trace.some((item) => item.message.includes("budget exceeded"))).toBe(true);
  });

  it("denies on rate limit hits", () => {
    const result = evaluatePolicy(
      baseInput({
        rate_limits: {
          policy: {
            id: "rl1",
            org_id: "org_1",
            calls_per_minute: 2
          },
          current_calls: 2
        }
      })
    );

    expect(result.decision).toBe("DENY");
    expect(result.trace.some((item) => item.message.includes("Rate limit exceeded"))).toBe(true);
  });

  it("supports wildcard rules", () => {
    const result = evaluatePolicy(
      baseInput({
        rules: [
          {
            id: "r1",
            org_id: "org_1",
            agent_id: "*",
            tool_name: "http",
            tool_action: "*",
            effect: "ALLOW",
            priority: 10
          }
        ],
        context: {
          org_id: "org_1",
          agent_id: "agent_2",
          tool_name: "http",
          tool_action: "GET",
          cost_estimate_usd: 0.01,
          timestamp: new Date().toISOString()
        }
      })
    );

    expect(result.decision).toBe("ALLOW");
  });
});
