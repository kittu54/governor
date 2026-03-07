export type GovernorDecision = "ALLOW" | "DENY" | "REQUIRE_APPROVAL";

export type PolicyEffect = "ALLOW" | "DENY";

export interface PolicyRule {
  id: string;
  org_id: string;
  agent_id?: string | null;
  tool_name: string;
  tool_action: string;
  effect: PolicyEffect;
  priority: number;
  reason?: string;
}

export interface ApprovalThreshold {
  id: string;
  org_id: string;
  agent_id?: string | null;
  tool_name: string;
  tool_action: string;
  amount_usd: number;
}

export interface BudgetLimit {
  id: string;
  org_id: string;
  agent_id?: string | null;
  daily_limit_usd: number;
}

export interface RateLimitPolicy {
  id: string;
  org_id: string;
  agent_id?: string | null;
  calls_per_minute: number;
}

export interface DecisionTraceItem {
  code:
    | "RULE_MATCH"
    | "BUDGET_CHECK"
    | "RATE_LIMIT_CHECK"
    | "THRESHOLD_CHECK"
    | "DEFAULT_ALLOW"
    | "DENY"
    | "REQUIRE_APPROVAL"
    | "ALLOW";
  message: string;
  metadata?: Record<string, unknown>;
}

export interface BudgetSnapshot {
  org_spend_today_usd: number;
  org_limit_usd?: number;
  agent_spend_today_usd: number;
  agent_limit_usd?: number;
  cost_estimate_usd: number;
}

export interface RateLimitSnapshot {
  calls_in_current_window: number;
  limit: number;
  window_seconds: number;
}

export interface PolicyEvaluationContext {
  org_id: string;
  user_id?: string;
  agent_id: string;
  session_id?: string;
  tool_name: string;
  tool_action: string;
  cost_estimate_usd: number;
  timestamp: string;
}

export interface PolicyEvaluationInput {
  context: PolicyEvaluationContext;
  rules: PolicyRule[];
  thresholds: ApprovalThreshold[];
  budgets: {
    org?: BudgetLimit;
    agent?: BudgetLimit;
    usage: {
      org_spend_today_usd: number;
      agent_spend_today_usd: number;
    };
  };
  rate_limits: {
    policy?: RateLimitPolicy;
    current_calls: number;
  };
}

export interface PolicyEvaluationResult {
  decision: GovernorDecision;
  trace: DecisionTraceItem[];
  matched_rule_ids: string[];
  budget_snapshot: BudgetSnapshot;
  rate_limit_snapshot?: RateLimitSnapshot;
}

export interface EvaluateRequest {
  org_id: string;
  user_id?: string;
  agent_id: string;
  session_id?: string;
  tool_name: string;
  tool_action: string;
  cost_estimate_usd?: number;
  input_summary?: string;
}

export interface EvaluateResponse {
  request_id: string;
  decision: GovernorDecision;
  trace: DecisionTraceItem[];
  approval_request_id?: string;
  matched_rule_ids: string[];
}

export interface AuditEventRecord {
  id: string;
  timestamp: string;
  org_id: string;
  user_id?: string | null;
  agent_id: string;
  session_id?: string | null;
  tool_name: string;
  tool_action: string;
  decision: GovernorDecision;
  status: "PENDING" | "SUCCESS" | "ERROR" | "DENIED" | "REQUIRES_APPROVAL";
  cost_estimate_usd: number;
  latency_ms?: number | null;
  policy_trace: DecisionTraceItem[];
  input_summary?: string | null;
  output_summary?: string | null;
  error_message?: string | null;
}

export interface ApprovalRequestRecord {
  id: string;
  org_id: string;
  agent_id: string;
  user_id?: string | null;
  session_id?: string | null;
  tool_name: string;
  tool_action: string;
  cost_estimate_usd: number;
  status: "PENDING" | "APPROVED" | "DENIED";
  requested_at: string;
  decided_at?: string | null;
  decided_by?: string | null;
  trace: DecisionTraceItem[];
}

export type AgentRuntimeSource = "OPENAI" | "ANTHROPIC" | "GEMINI" | "LANGCHAIN" | "MCP" | "CUSTOM";
export type AgentRunStatus = "RUNNING" | "SUCCESS" | "ERROR" | "CANCELED";
export type AgentEventType =
  | "RUN_STARTED"
  | "RUN_COMPLETED"
  | "RUN_FAILED"
  | "STEP"
  | "MODEL_CALL"
  | "MODEL_RESULT"
  | "TOOL_CALL"
  | "TOOL_RESULT"
  | "APPROVAL_REQUESTED";

export interface IngestRunInput {
  run_id: string;
  org_id: string;
  agent_id: string;
  session_id?: string;
  user_id?: string;
  source: AgentRuntimeSource;
  provider?: string;
  model?: string;
  framework?: string;
  runtime?: string;
  task_name?: string;
  prompt_hash?: string;
  started_at?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface IngestEventInput {
  event_id?: string;
  run_id: string;
  org_id: string;
  agent_id: string;
  timestamp?: string;
  type: AgentEventType;
  source: AgentRuntimeSource;
  provider?: string;
  model?: string;
  step_name?: string;
  tool_name?: string;
  tool_action?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  latency_ms?: number;
  status?: string;
  error_message?: string;
  sequence?: number;
  input_payload?: Record<string, unknown>;
  output_payload?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface IngestFinalizeInput {
  status: AgentRunStatus;
  ended_at?: string;
  duration_ms?: number;
  error_message?: string;
}

export interface IngestEventsRequest {
  run: IngestRunInput;
  events: IngestEventInput[];
  finalize?: IngestFinalizeInput;
}

export interface IngestEventsResponse {
  run_id: string;
  accepted_events: number;
  deduped_events: number;
  run_status: AgentRunStatus;
}

export interface AgentRunRecord {
  id: string;
  org_id: string;
  agent_id: string;
  source: AgentRuntimeSource;
  provider?: string | null;
  model?: string | null;
  framework?: string | null;
  runtime?: string | null;
  task_name?: string | null;
  status: AgentRunStatus;
  started_at: string;
  ended_at?: string | null;
  duration_ms?: number | null;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_tool_calls: number;
  error_message?: string | null;
  risk_score?: number | null;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
}

export interface AgentEventRecord {
  id: string;
  run_id: string;
  org_id: string;
  agent_id: string;
  timestamp: string;
  type: AgentEventType;
  source: AgentRuntimeSource;
  provider?: string | null;
  model?: string | null;
  step_name?: string | null;
  tool_name?: string | null;
  tool_action?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cost_usd: number;
  latency_ms?: number | null;
  status?: string | null;
  error_message?: string | null;
  sequence?: number | null;
  input_payload?: Record<string, unknown> | null;
  output_payload?: Record<string, unknown> | null;
  parameters?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}
