import { z } from "zod";

export const evaluateRequestSchema = z.object({
  org_id: z.string().min(1),
  user_id: z.string().optional(),
  agent_id: z.string().min(1),
  session_id: z.string().optional(),
  tool_name: z.string().min(1),
  tool_action: z.string().min(1),
  cost_estimate_usd: z.number().min(0).default(0),
  input_summary: z.string().optional()
});

export const auditCompleteSchema = z.object({
  request_id: z.string().min(1),
  status: z.enum(["SUCCESS", "ERROR"]),
  latency_ms: z.number().int().min(0),
  output_summary: z.string().optional(),
  error_message: z.string().optional()
});

export const approvalDecisionSchema = z.object({
  approval_id: z.string().min(1),
  action: z.enum(["APPROVE", "DENY"]),
  decided_by: z.string().min(1)
});

export const policyRuleSchema = z.object({
  org_id: z.string().min(1),
  agent_id: z.string().optional().nullable(),
  tool_name: z.string().min(1),
  tool_action: z.string().min(1),
  effect: z.enum(["ALLOW", "DENY"]),
  priority: z.number().int().min(0).default(100),
  reason: z.string().optional()
});

export const thresholdSchema = z.object({
  org_id: z.string().min(1),
  agent_id: z.string().optional().nullable(),
  tool_name: z.string().min(1),
  tool_action: z.string().min(1),
  amount_usd: z.number().min(0)
});

export const budgetSchema = z.object({
  org_id: z.string().min(1),
  agent_id: z.string().optional().nullable(),
  daily_limit_usd: z.number().min(0)
});

export const rateLimitSchema = z.object({
  org_id: z.string().min(1),
  agent_id: z.string().optional().nullable(),
  calls_per_minute: z.number().int().min(1)
});

const runtimeSourceSchema = z.enum([
  "OPENAI", "ANTHROPIC", "GEMINI", "LANGCHAIN", "MCP", "CUSTOM",
  "ZAPIER", "MINDSTUDIO", "LINDY", "AGENTGPT", "RELEVANCE_AI",
  "COPILOT_STUDIO", "VERTEX_AI", "AGENTFORCE", "WATSONX",
  "CREWAI", "AUTOGEN", "PYDANTIC_AI", "N8N", "MAKE", "WEBHOOK"
]);

const agentEventTypeSchema = z.enum([
  "RUN_STARTED",
  "RUN_COMPLETED",
  "RUN_FAILED",
  "STEP",
  "MODEL_CALL",
  "MODEL_RESULT",
  "TOOL_CALL",
  "TOOL_RESULT",
  "APPROVAL_REQUESTED"
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
  metadata: z.record(z.string(), z.unknown()).optional()
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
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const ingestFinalizeSchema = z.object({
  status: z.enum(["RUNNING", "SUCCESS", "ERROR", "CANCELED"]),
  ended_at: z.string().datetime().optional(),
  duration_ms: z.number().int().min(0).optional(),
  error_message: z.string().optional()
});

export const ingestEventsRequestSchema = z.object({
  run: ingestRunSchema,
  events: z.array(ingestEventSchema).default([]),
  finalize: ingestFinalizeSchema.optional()
});

export const runAnalyzeSchema = z.object({
  question: z.string().min(1)
});

export const gatewayCheckSchema = z.object({
  agent_id: z.string().min(1),
  tool_name: z.string().min(1),
  tool_action: z.string().min(1),
  cost_estimate_usd: z.number().min(0).default(0),
  input_summary: z.string().optional(),
  user_id: z.string().optional(),
  session_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const createAgentSchema = z.object({
  id: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, "Agent ID must be alphanumeric with underscores/hyphens"),
  org_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
  framework: z.string().optional(),
  tags: z.array(z.string()).optional(),
  allowed_tools: z.array(z.object({
    tool_name: z.string().min(1),
    tool_action: z.string().min(1).default("*")
  })).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  framework: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  allowed_tools: z.array(z.object({
    tool_name: z.string().min(1),
    tool_action: z.string().min(1).default("*")
  })).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable()
});
