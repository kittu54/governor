import type { RiskClass } from "./risk";

// ──────────────────────────────────────────────────────────────
// Core Enums
// ──────────────────────────────────────────────────────────────

export type GovernorDecision = "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
export type PolicyEffect = "ALLOW" | "DENY";
export type EnforcementMode = "DEV" | "STAGING" | "PROD";
export type PolicyStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ScopeType = "ORG" | "AGENT" | "TOOL" | "RISK_CLASS";
export type BudgetPeriod = "DAILY" | "WEEKLY" | "MONTHLY";
export type ApprovalActionKind = "APPROVE" | "DENY" | "ESCALATE" | "COMMENT";

// ──────────────────────────────────────────────────────────────
// Conditions DSL
// ──────────────────────────────────────────────────────────────

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "in"
  | "not_in"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "contains"
  | "not_contains"
  | "regex"
  | "exists"
  | "not_exists";

export interface LeafCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface AndCondition {
  and: Condition[];
}

export interface OrCondition {
  or: Condition[];
}

export interface NotCondition {
  not: Condition;
}

export type Condition = LeafCondition | AndCondition | OrCondition | NotCondition;

// ──────────────────────────────────────────────────────────────
// Legacy Policy Primitives (backward compat)
// ──────────────────────────────────────────────────────────────

export interface PolicyRule {
  id: string;
  org_id: string;
  agent_id?: string | null;
  tool_name: string;
  tool_action: string;
  effect: PolicyEffect;
  priority: number;
  reason?: string;
  risk_class?: RiskClass | null;
  conditions?: Condition | null;
}

export interface ApprovalThreshold {
  id: string;
  org_id: string;
  agent_id?: string | null;
  tool_name: string;
  tool_action: string;
  amount_usd: number;
  risk_class?: RiskClass | null;
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

// ──────────────────────────────────────────────────────────────
// V2 Policy Definitions (versioned)
// ──────────────────────────────────────────────────────────────

export interface PolicyRuleDefinition {
  id?: string;
  priority: number;
  effect: PolicyEffect | "REQUIRE_APPROVAL";
  subject_type: "ORG" | "AGENT" | "TOOL" | "RISK_CLASS" | "USER" | "ENVIRONMENT";
  subject_value?: string;
  conditions?: Condition;
  reason_template: string;
}

export interface PolicyDefinition {
  rules: PolicyRuleDefinition[];
  budgets?: BudgetDefinition[];
  rate_limits?: RateLimitDefinition[];
  approval_requirements?: ApprovalRequirementDefinition[];
}

export interface BudgetDefinition {
  scope_type: ScopeType;
  scope_id?: string;
  period: BudgetPeriod;
  limit_usd: number;
  warn_at_usd?: number;
  hard_stop: boolean;
}

export interface RateLimitDefinition {
  scope_type: ScopeType;
  scope_id?: string;
  window_seconds: number;
  max_calls: number;
}

export interface ApprovalRequirementDefinition {
  risk_class?: RiskClass;
  tool_name?: string;
  tool_action?: string;
  threshold_usd?: number;
  requires_reason: boolean;
  auto_expire_seconds: number;
}

// ──────────────────────────────────────────────────────────────
// Decision Trace
// ──────────────────────────────────────────────────────────────

export type TraceCode =
  | "MODE_CHECK"
  | "SENSITIVE_CHECK"
  | "RISK_CLASS_CHECK"
  | "BUDGET_CHECK"
  | "BUDGET_WARN"
  | "RATE_LIMIT_CHECK"
  | "RULE_MATCH"
  | "CONDITION_EVAL"
  | "THRESHOLD_CHECK"
  | "APPROVAL_POLICY_CHECK"
  | "DEFAULT_ALLOW"
  | "DEFAULT_DENY"
  | "DENY"
  | "REQUIRE_APPROVAL"
  | "ALLOW";

export interface DecisionTraceItem {
  code: TraceCode | string;
  check_type?: string;
  message: string;
  timestamp?: string;
  policy_version_id?: string;
  matched_rule_id?: string;
  metadata?: Record<string, unknown>;
}

export interface BudgetSnapshot {
  org_spend_today_usd: number;
  org_limit_usd?: number;
  agent_spend_today_usd: number;
  agent_limit_usd?: number;
  cost_estimate_usd: number;
  warning?: string;
}

export interface RateLimitSnapshot {
  calls_in_current_window: number;
  limit: number;
  window_seconds: number;
}

// ──────────────────────────────────────────────────────────────
// Evaluation Context & Results
// ──────────────────────────────────────────────────────────────

export interface PolicyEvaluationContext {
  org_id: string;
  user_id?: string;
  agent_id: string;
  session_id?: string;
  environment: EnforcementMode;
  tool_name: string;
  tool_action: string;
  risk_class: RiskClass;
  cost_estimate_usd: number;
  is_sensitive: boolean;
  timestamp: string;
  metadata?: Record<string, unknown>;
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
  approval_policies?: ApprovalRequirementDefinition[];
  policy_version_id?: string;
}

export interface PolicyEvaluationResult {
  decision: GovernorDecision;
  reason: string;
  trace: DecisionTraceItem[];
  warnings: string[];
  matched_rule_ids: string[];
  matched_policy_version_id?: string;
  budget_snapshot: BudgetSnapshot;
  rate_limit_snapshot?: RateLimitSnapshot;
  normalized_facts: Record<string, unknown>;
  enforcement_mode: EnforcementMode;
  risk_class: RiskClass;
  duration_ms?: number;
}

// ──────────────────────────────────────────────────────────────
// API Request / Response
// ──────────────────────────────────────────────────────────────

export interface EvaluateRequest {
  org_id: string;
  user_id?: string;
  agent_id: string;
  session_id?: string;
  tool_name: string;
  tool_action: string;
  cost_estimate_usd?: number;
  input_summary?: string;
  environment?: EnforcementMode;
  metadata?: Record<string, unknown>;
  dry_run?: boolean;
}

export interface EvaluateResponse {
  request_id: string;
  decision: GovernorDecision;
  reason: string;
  trace: DecisionTraceItem[];
  warnings: string[];
  risk_class: RiskClass;
  enforcement_mode: EnforcementMode;
  approval_request_id?: string;
  matched_rule_ids: string[];
  matched_policy_version_id?: string;
  duration_ms: number;
}

export interface ExplainResponse extends EvaluateResponse {
  explanation: string[];
  normalized_facts: Record<string, unknown>;
}

export interface SimulateRequest extends EvaluateRequest {
  policy_version_id?: string;
}

export interface SimulateResponse {
  current: EvaluateResponse;
  simulated: EvaluateResponse;
  diff: {
    decision_changed: boolean;
    current_decision: GovernorDecision;
    simulated_decision: GovernorDecision;
  };
}

export interface BlastRadiusRequest {
  org_id: string;
  policy_version_id: string;
  lookback_days?: number;
  sample_size?: number;
}

export interface BlastRadiusResponse {
  total_evaluations: number;
  sampled: number;
  flipped: {
    allow_to_deny: number;
    allow_to_approval: number;
    approval_to_deny: number;
    deny_to_allow: number;
    approval_to_allow: number;
  };
  estimated_blocked_spend_usd: number;
  most_affected_tools: { tool: string; flips: number }[];
  most_affected_agents: { agent_id: string; flips: number }[];
  sample_events: {
    tool_name: string;
    tool_action: string;
    current_decision: GovernorDecision;
    simulated_decision: GovernorDecision;
    cost_estimate_usd: number;
  }[];
}

// ──────────────────────────────────────────────────────────────
// Audit
// ──────────────────────────────────────────────────────────────

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
  risk_class?: RiskClass | null;
  cost_estimate_usd: number;
  status: "PENDING" | "APPROVED" | "DENIED" | "EXPIRED" | "CANCELED";
  reason?: string | null;
  evidence_json?: Record<string, unknown> | null;
  requested_at: string;
  expires_at?: string | null;
  decided_at?: string | null;
  decided_by?: string | null;
  trace: DecisionTraceItem[];
}

// ──────────────────────────────────────────────────────────────
// Telemetry
// ──────────────────────────────────────────────────────────────

export type AgentRuntimeSource =
  | "OPENAI" | "ANTHROPIC" | "GEMINI" | "LANGCHAIN" | "MCP" | "CUSTOM"
  | "ZAPIER" | "MINDSTUDIO" | "LINDY" | "AGENTGPT" | "RELEVANCE_AI"
  | "COPILOT_STUDIO" | "VERTEX_AI" | "AGENTFORCE" | "WATSONX"
  | "CREWAI" | "AUTOGEN" | "PYDANTIC_AI" | "N8N" | "MAKE" | "WEBHOOK";

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
  agent_name?: string;
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
