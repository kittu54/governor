import { z } from "zod";
import { RISK_CLASSES } from "./risk";

// ──────────────────────────────────────────────────────────────
// Reusable Enums
// ──────────────────────────────────────────────────────────────

export const riskClassSchema = z.enum(RISK_CLASSES as unknown as [string, ...string[]]);
export const enforcementModeSchema = z.enum(["DEV", "STAGING", "PROD"]);
export const policyStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const scopeTypeSchema = z.enum(["ORG", "AGENT", "TOOL", "RISK_CLASS"]);
export const budgetPeriodSchema = z.enum(["DAILY", "WEEKLY", "MONTHLY"]);
export const decisionSchema = z.enum(["ALLOW", "DENY", "REQUIRE_APPROVAL"]);
export const policyEffectSchema = z.enum(["ALLOW", "DENY"]);

// ──────────────────────────────────────────────────────────────
// Conditions DSL Schema
// ──────────────────────────────────────────────────────────────

export const conditionOperatorSchema = z.enum([
  "equals", "not_equals", "in", "not_in",
  "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal",
  "contains", "not_contains", "regex", "exists", "not_exists",
]);

const leafConditionSchema = z.object({
  field: z.string().min(1),
  operator: conditionOperatorSchema,
  value: z.unknown(),
});

export const conditionSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    leafConditionSchema,
    z.object({ and: z.array(conditionSchema) }),
    z.object({ or: z.array(conditionSchema) }),
    z.object({ not: conditionSchema }),
  ])
);

// ──────────────────────────────────────────────────────────────
// Evaluate
// ──────────────────────────────────────────────────────────────

export const evaluateRequestSchema = z.object({
  org_id: z.string().min(1),
  user_id: z.string().optional(),
  agent_id: z.string().min(1),
  session_id: z.string().optional(),
  tool_name: z.string().min(1),
  tool_action: z.string().min(1),
  cost_estimate_usd: z.number().min(0).default(0),
  input_summary: z.string().optional(),
  environment: enforcementModeSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  dry_run: z.boolean().optional(),
});

export const simulateRequestSchema = evaluateRequestSchema.extend({
  policy_version_id: z.string().optional(),
});

export const blastRadiusRequestSchema = z.object({
  org_id: z.string().min(1),
  policy_version_id: z.string().min(1),
  lookback_days: z.number().int().min(1).max(90).default(7),
  sample_size: z.number().int().min(1).max(10000).default(1000),
});

// ──────────────────────────────────────────────────────────────
// Audit
// ──────────────────────────────────────────────────────────────

export const auditCompleteSchema = z.object({
  request_id: z.string().min(1),
  status: z.enum(["SUCCESS", "ERROR"]),
  latency_ms: z.number().int().min(0),
  output_summary: z.string().optional(),
  error_message: z.string().optional(),
});

// ──────────────────────────────────────────────────────────────
// Approvals
// ──────────────────────────────────────────────────────────────

export const approvalDecisionSchema = z.object({
  approval_id: z.string().min(1),
  action: z.enum(["APPROVE", "DENY"]),
  decided_by: z.string().min(1),
  comment: z.string().optional(),
  reason: z.string().optional(),
});

export const approvalActionSchema = z.object({
  action: z.enum(["APPROVE", "DENY", "ESCALATE", "COMMENT"]),
  comment: z.string().optional(),
  actor_user_id: z.string().optional(),
});

// ──────────────────────────────────────────────────────────────
// Policy Rules (legacy)
// ──────────────────────────────────────────────────────────────

export const policyRuleSchema = z.object({
  org_id: z.string().min(1),
  agent_id: z.string().optional().nullable(),
  tool_name: z.string().min(1),
  tool_action: z.string().min(1),
  effect: policyEffectSchema,
  priority: z.number().int().min(0).default(100),
  reason: z.string().optional(),
  risk_class: riskClassSchema.optional().nullable(),
  conditions: conditionSchema.optional().nullable(),
});

export const thresholdSchema = z.object({
  org_id: z.string().min(1),
  agent_id: z.string().optional().nullable(),
  tool_name: z.string().min(1),
  tool_action: z.string().min(1),
  amount_usd: z.number().min(0),
  risk_class: riskClassSchema.optional().nullable(),
});

export const budgetSchema = z.object({
  org_id: z.string().min(1),
  agent_id: z.string().optional().nullable(),
  daily_limit_usd: z.number().min(0),
});

export const rateLimitSchema = z.object({
  org_id: z.string().min(1),
  agent_id: z.string().optional().nullable(),
  calls_per_minute: z.number().int().min(1),
});

// ──────────────────────────────────────────────────────────────
// Versioned Policy
// ──────────────────────────────────────────────────────────────

export const policyRuleDefinitionSchema = z.object({
  id: z.string().optional(),
  priority: z.number().int().min(0).default(100),
  effect: z.enum(["ALLOW", "DENY", "REQUIRE_APPROVAL"]),
  subject_type: z.enum(["ORG", "AGENT", "TOOL", "RISK_CLASS", "USER", "ENVIRONMENT"]),
  subject_value: z.string().optional(),
  conditions: conditionSchema.optional(),
  reason_template: z.string().min(1),
});

export const policyDefinitionSchema = z.object({
  rules: z.array(policyRuleDefinitionSchema).min(1),
  budgets: z.array(z.object({
    scope_type: scopeTypeSchema,
    scope_id: z.string().optional(),
    period: budgetPeriodSchema,
    limit_usd: z.number().min(0),
    warn_at_usd: z.number().min(0).optional(),
    hard_stop: z.boolean().default(true),
  })).optional(),
  rate_limits: z.array(z.object({
    scope_type: scopeTypeSchema,
    scope_id: z.string().optional(),
    window_seconds: z.number().int().min(1).default(60),
    max_calls: z.number().int().min(1),
  })).optional(),
  approval_requirements: z.array(z.object({
    risk_class: riskClassSchema.optional(),
    tool_name: z.string().optional(),
    tool_action: z.string().optional(),
    threshold_usd: z.number().min(0).optional(),
    requires_reason: z.boolean().default(false),
    auto_expire_seconds: z.number().int().min(60).default(3600),
  })).optional(),
});

export const createPolicySchema = z.object({
  org_id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  enforcement_mode: enforcementModeSchema.default("DEV"),
  created_by: z.string().optional(),
});

export const updatePolicySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: policyStatusSchema.optional(),
  enforcement_mode: enforcementModeSchema.optional(),
});

export const createPolicyVersionSchema = z.object({
  definition: policyDefinitionSchema,
  change_summary: z.string().max(1000).optional(),
  created_by: z.string().optional(),
});

// ──────────────────────────────────────────────────────────────
// Tool Registry
// ──────────────────────────────────────────────────────────────

export const createToolSchema = z.object({
  org_id: z.string().min(1),
  tool_name: z.string().min(1).max(200),
  tool_action: z.string().min(1).max(200),
  display_name: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  risk_class: riskClassSchema.default("LOW_RISK"),
  is_sensitive: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateToolSchema = z.object({
  display_name: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  risk_class: riskClassSchema.optional(),
  is_sensitive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const classifyRiskSchema = z.object({
  tool_name: z.string().min(1),
  tool_action: z.string().min(1),
});

// ──────────────────────────────────────────────────────────────
// Approval Policy
// ──────────────────────────────────────────────────────────────

export const createApprovalPolicySchema = z.object({
  org_id: z.string().min(1),
  name: z.string().min(1).max(200),
  risk_class: riskClassSchema.optional().nullable(),
  tool_name: z.string().optional().nullable(),
  tool_action: z.string().optional().nullable(),
  threshold_usd: z.number().min(0).optional().nullable(),
  requires_reason: z.boolean().default(false),
  auto_expire_seconds: z.number().int().min(60).default(3600),
  escalation_policy_json: z.record(z.string(), z.unknown()).optional().nullable(),
});

// ──────────────────────────────────────────────────────────────
// V2 Budgets & Rate Limits
// ──────────────────────────────────────────────────────────────

export const createBudgetV2Schema = z.object({
  org_id: z.string().min(1),
  scope_type: scopeTypeSchema.default("ORG"),
  scope_id: z.string().optional().nullable(),
  period: budgetPeriodSchema.default("DAILY"),
  limit_usd: z.number().min(0),
  warn_at_usd: z.number().min(0).optional().nullable(),
  hard_stop: z.boolean().default(true),
});

export const createRateLimitV2Schema = z.object({
  org_id: z.string().min(1),
  scope_type: scopeTypeSchema.default("ORG"),
  scope_id: z.string().optional().nullable(),
  window_seconds: z.number().int().min(1).default(60),
  max_calls: z.number().int().min(1),
});

// ──────────────────────────────────────────────────────────────
// Webhooks
// ──────────────────────────────────────────────────────────────

export const createWebhookSchema = z.object({
  org_id: z.string().min(1),
  target_url: z.string().url(),
  event_types: z.array(z.string().min(1)).min(1),
  is_active: z.boolean().default(true),
});

export const updateWebhookSchema = z.object({
  target_url: z.string().url().optional(),
  event_types: z.array(z.string().min(1)).optional(),
  is_active: z.boolean().optional(),
});

// ──────────────────────────────────────────────────────────────
// Agents
// ──────────────────────────────────────────────────────────────

export const createAgentSchema = z.object({
  id: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, "Agent ID must be alphanumeric with underscores/hyphens"),
  org_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
  environment: enforcementModeSchema.optional(),
  framework: z.string().optional(),
  provider: z.string().optional(),
  tags: z.array(z.string()).optional(),
  allowed_tools: z.array(z.object({
    tool_name: z.string().min(1),
    tool_action: z.string().min(1).default("*"),
  })).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  environment: enforcementModeSchema.optional(),
  framework: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  allowed_tools: z.array(z.object({
    tool_name: z.string().min(1),
    tool_action: z.string().min(1).default("*"),
  })).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// ──────────────────────────────────────────────────────────────
// Telemetry / Ingest
// ──────────────────────────────────────────────────────────────

const runtimeSourceSchema = z.enum([
  "OPENAI", "ANTHROPIC", "GEMINI", "LANGCHAIN", "MCP", "CUSTOM",
  "ZAPIER", "MINDSTUDIO", "LINDY", "AGENTGPT", "RELEVANCE_AI",
  "COPILOT_STUDIO", "VERTEX_AI", "AGENTFORCE", "WATSONX",
  "CREWAI", "AUTOGEN", "PYDANTIC_AI", "N8N", "MAKE", "WEBHOOK",
]);

const agentEventTypeSchema = z.enum([
  "RUN_STARTED", "RUN_COMPLETED", "RUN_FAILED",
  "STEP", "MODEL_CALL", "MODEL_RESULT",
  "TOOL_CALL", "TOOL_RESULT", "APPROVAL_REQUESTED",
]);

export const ingestRunSchema = z.object({
  run_id: z.string().min(1),
  org_id: z.string().min(1),
  agent_id: z.string().min(1),
  agent_name: z.string().min(1).optional(),
  session_id: z.string().optional(),
  user_id: z.string().optional(),
  source: runtimeSourceSchema,
  provider: z.string().optional(),
  model: z.string().optional(),
  framework: z.string().optional(),
  runtime: z.string().optional(),
  task_name: z.string().optional(),
  prompt_hash: z.string().optional(),
  started_at: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const ingestEventSchema = z.object({
  event_id: z.string().optional(),
  run_id: z.string().min(1),
  org_id: z.string().min(1),
  agent_id: z.string().min(1),
  timestamp: z.string().datetime().optional(),
  type: agentEventTypeSchema,
  source: runtimeSourceSchema,
  provider: z.string().optional(),
  model: z.string().optional(),
  step_name: z.string().optional(),
  tool_name: z.string().optional(),
  tool_action: z.string().optional(),
  input_tokens: z.number().int().min(0).optional(),
  output_tokens: z.number().int().min(0).optional(),
  cost_usd: z.number().min(0).optional(),
  latency_ms: z.number().int().min(0).optional(),
  status: z.string().optional(),
  error_message: z.string().optional(),
  sequence: z.number().int().min(0).optional(),
  input_payload: z.record(z.string(), z.unknown()).optional(),
  output_payload: z.record(z.string(), z.unknown()).optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const ingestFinalizeSchema = z.object({
  status: z.enum(["RUNNING", "SUCCESS", "ERROR", "CANCELED"]),
  ended_at: z.string().datetime().optional(),
  duration_ms: z.number().int().min(0).optional(),
  error_message: z.string().optional(),
});

export const ingestEventsRequestSchema = z.object({
  run: ingestRunSchema,
  events: z.array(ingestEventSchema).default([]),
  finalize: ingestFinalizeSchema.optional(),
});

export const runAnalyzeSchema = z.object({
  question: z.string().min(1),
});

export const gatewayCheckSchema = z.object({
  agent_id: z.string().min(1),
  tool_name: z.string().min(1),
  tool_action: z.string().min(1),
  cost_estimate_usd: z.number().min(0).default(0),
  input_summary: z.string().optional(),
  user_id: z.string().optional(),
  session_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ──────────────────────────────────────────────────────────────
// Audit Log
// ──────────────────────────────────────────────────────────────

export const auditLogQuerySchema = z.object({
  org_id: z.string().min(1),
  event_type: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  actor_type: z.enum(["SYSTEM", "USER", "AGENT"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});
