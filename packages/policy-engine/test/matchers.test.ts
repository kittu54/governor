import { describe, expect, it } from "vitest";
import { wildcardMatch, ruleMatches } from "../src/matchers";

describe("wildcardMatch", () => {
  it("matches exact strings", () => {
    expect(wildcardMatch("stripe", "stripe")).toBe(true);
  });

  it("rejects non-matching strings", () => {
    expect(wildcardMatch("stripe", "github")).toBe(false);
  });

  it("matches wildcard *", () => {
    expect(wildcardMatch("anything", "*")).toBe(true);
  });

  it("matches prefix wildcard", () => {
    expect(wildcardMatch("stripe.refund", "stripe.*")).toBe(true);
    expect(wildcardMatch("github.delete", "stripe.*")).toBe(false);
  });

  it("matches suffix wildcard", () => {
    expect(wildcardMatch("stripe.refund", "*.refund")).toBe(true);
    expect(wildcardMatch("stripe.charge", "*.refund")).toBe(false);
  });

  it("matches middle wildcard", () => {
    expect(wildcardMatch("api.v2.refund", "api.*.refund")).toBe(true);
    expect(wildcardMatch("api.v2.charge", "api.*.refund")).toBe(false);
  });

  it("handles regex special characters safely", () => {
    expect(wildcardMatch("file.ts", "file.ts")).toBe(true);
    expect(wildcardMatch("filexts", "file.ts")).toBe(false);
    expect(wildcardMatch("foo(bar)", "foo(bar)")).toBe(true);
    expect(wildcardMatch("foo[0]", "foo[0]")).toBe(true);
  });

  it("requires full match (not partial)", () => {
    expect(wildcardMatch("stripe-extra", "stripe")).toBe(false);
    expect(wildcardMatch("pre-stripe", "stripe")).toBe(false);
  });
});

describe("ruleMatches", () => {
  const baseRule = {
    id: "r1",
    org_id: "org_1",
    agent_id: "*",
    tool_name: "stripe",
    tool_action: "refund",
    effect: "ALLOW" as const,
    priority: 1
  };

  const baseInput = {
    org_id: "org_1",
    agent_id: "agent_1",
    tool_name: "stripe",
    tool_action: "refund"
  };

  it("matches when all fields match", () => {
    expect(ruleMatches(baseRule, baseInput)).toBe(true);
  });

  it("rejects when org_id differs", () => {
    expect(ruleMatches(baseRule, { ...baseInput, org_id: "org_2" })).toBe(false);
  });

  it("matches when agent_id is null (applies to all agents)", () => {
    expect(ruleMatches({ ...baseRule, agent_id: null }, baseInput)).toBe(true);
  });

  it("matches when agent_id is undefined", () => {
    expect(ruleMatches({ ...baseRule, agent_id: undefined }, baseInput)).toBe(true);
  });

  it("matches specific agent_id", () => {
    expect(ruleMatches({ ...baseRule, agent_id: "agent_1" }, baseInput)).toBe(true);
    expect(ruleMatches({ ...baseRule, agent_id: "agent_2" }, baseInput)).toBe(false);
  });

  it("rejects when tool_name differs", () => {
    expect(ruleMatches(baseRule, { ...baseInput, tool_name: "github" })).toBe(false);
  });

  it("rejects when tool_action differs", () => {
    expect(ruleMatches(baseRule, { ...baseInput, tool_action: "charge" })).toBe(false);
  });

  it("supports wildcard org_id", () => {
    expect(ruleMatches({ ...baseRule, org_id: "*" }, { ...baseInput, org_id: "any_org" })).toBe(true);
  });
});
