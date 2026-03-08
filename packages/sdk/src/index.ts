import type {
  AgentRuntimeSource,
  EvaluateRequest,
  EvaluateResponse,
  ExplainResponse,
  IngestEventInput,
  IngestEventsRequest,
  IngestEventsResponse,
  RiskClass,
  EnforcementMode,
  DecisionTraceItem,
} from "@governor/shared";

export interface GovernorClientConfig {
  api_base_url: string;
  api_key?: string;
  org_id: string;
  user_id?: string;
  agent_id: string;
  session_id?: string;
  environment?: EnforcementMode;
  timeout_ms?: number;
  max_retries?: number;
  on_error?: "throw" | "allow" | "deny";
}

export interface WrapToolOptions<TArgs extends unknown[], TResult> {
  tool_name: string;
  tool_action: string;
  handler: (...args: TArgs) => Promise<TResult> | TResult;
  costEstimator?: (...args: TArgs) => number;
  inputSummarizer?: (...args: TArgs) => string;
  outputSummarizer?: (result: TResult) => string;
}

export interface TelemetryRunOptions {
  run_id: string;
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

export class GovernorDeniedError extends Error {
  public readonly risk_class?: RiskClass;
  public readonly enforcement_mode?: EnforcementMode;
  constructor(
    message: string,
    public readonly trace: DecisionTraceItem[],
    public readonly reason?: string,
    opts?: { risk_class?: RiskClass; enforcement_mode?: EnforcementMode }
  ) {
    super(message);
    this.name = "GovernorDeniedError";
    this.risk_class = opts?.risk_class;
    this.enforcement_mode = opts?.enforcement_mode;
  }
}

export class GovernorApprovalRequiredError extends Error {
  public readonly risk_class?: RiskClass;
  constructor(
    message: string,
    public readonly approval_request_id: string | undefined,
    public readonly trace: DecisionTraceItem[],
    public readonly reason?: string,
    opts?: { risk_class?: RiskClass }
  ) {
    super(message);
    this.name = "GovernorApprovalRequiredError";
    this.risk_class = opts?.risk_class;
  }
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}

function createEventId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries: number,
  timeoutMs?: number,
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (timeout) clearTimeout(timeout);
      if (response.status >= 500 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError ?? new Error("Request failed after retries");
}

export function createGovernor(config: GovernorClientConfig) {
  const maxRetries = config.max_retries ?? 2;
  const timeoutMs = config.timeout_ms;
  const onError = config.on_error ?? "throw";

  function headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      ...(config.api_key ? { authorization: `Bearer ${config.api_key}` } : {}),
    };
  }

  async function evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
    const response = await fetchWithRetry(
      joinUrl(config.api_base_url, "/v1/evaluate"),
      { method: "POST", headers: headers(), body: JSON.stringify(request) },
      maxRetries,
      timeoutMs,
    );

    if (!response.ok) {
      throw new Error(`Governor evaluate failed: ${response.status}`);
    }

    return (await response.json()) as EvaluateResponse;
  }

  async function evaluateExplain(request: EvaluateRequest): Promise<ExplainResponse> {
    const response = await fetchWithRetry(
      joinUrl(config.api_base_url, "/v1/evaluate/explain"),
      { method: "POST", headers: headers(), body: JSON.stringify(request) },
      maxRetries,
      timeoutMs,
    );

    if (!response.ok) {
      throw new Error(`Governor explain failed: ${response.status}`);
    }

    return (await response.json()) as ExplainResponse;
  }

  async function complete(request_id: string, payload: {
    status: "SUCCESS" | "ERROR";
    latency_ms: number;
    output_summary?: string;
    error_message?: string;
  }): Promise<void> {
    const response = await fetch(joinUrl(config.api_base_url, "/v1/audit/complete"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.api_key ? { authorization: `Bearer ${config.api_key}` } : {})
      },
      body: JSON.stringify({ request_id, ...payload })
    });

    if (!response.ok) {
      throw new Error(`Governor complete failed: ${response.status}`);
    }
  }

  async function ingestEvents(payload: IngestEventsRequest): Promise<IngestEventsResponse> {
    const response = await fetch(joinUrl(config.api_base_url, "/v1/ingest/events"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.api_key ? { authorization: `Bearer ${config.api_key}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Governor ingest failed: ${response.status}`);
    }

    return (await response.json()) as IngestEventsResponse;
  }

  function wrapTool<TArgs extends unknown[], TResult>(options: WrapToolOptions<TArgs, TResult>) {
    return async (...args: TArgs): Promise<TResult> => {
      const startedAt = performance.now();
      const cost_estimate_usd = options.costEstimator?.(...args) ?? 0;
      const input_summary = options.inputSummarizer?.(...args);

      let evaluation: EvaluateResponse;
      try {
        evaluation = await evaluate({
          org_id: config.org_id,
          user_id: config.user_id,
          agent_id: config.agent_id,
          session_id: config.session_id,
          tool_name: options.tool_name,
          tool_action: options.tool_action,
          cost_estimate_usd,
          input_summary,
          environment: config.environment,
        });
      } catch (err) {
        if (onError === "allow") {
          return options.handler(...args);
        } else if (onError === "deny") {
          throw new GovernorDeniedError(
            "Governor unreachable and configured to deny on error",
            [],
            "Governor API unavailable"
          );
        }
        throw err;
      }

      if (evaluation.decision === "DENY") {
        throw new GovernorDeniedError(
          evaluation.reason ?? "Tool invocation denied by Governor policy",
          evaluation.trace,
          evaluation.reason,
          { risk_class: evaluation.risk_class, enforcement_mode: evaluation.enforcement_mode }
        );
      }

      if (evaluation.decision === "REQUIRE_APPROVAL") {
        throw new GovernorApprovalRequiredError(
          evaluation.reason ?? "Tool invocation requires approval",
          evaluation.approval_request_id,
          evaluation.trace,
          evaluation.reason,
          { risk_class: evaluation.risk_class }
        );
      }

      try {
        const result = await options.handler(...args);
        complete(evaluation.request_id, {
          status: "SUCCESS",
          latency_ms: Math.round(performance.now() - startedAt),
          output_summary: options.outputSummarizer?.(result),
        }).catch(() => {});
        return result;
      } catch (error) {
        complete(evaluation.request_id, {
          status: "ERROR",
          latency_ms: Math.round(performance.now() - startedAt),
          error_message: error instanceof Error ? error.message : "Unknown error",
        }).catch(() => {});
        throw error;
      }
    };
  }

  function createTelemetryRun(options: TelemetryRunOptions) {
    const baseRun = {
      run_id: options.run_id,
      org_id: config.org_id,
      agent_id: config.agent_id,
      session_id: config.session_id,
      user_id: config.user_id,
      source: options.source,
      provider: options.provider,
      model: options.model,
      framework: options.framework,
      runtime: options.runtime,
      task_name: options.task_name,
      prompt_hash: options.prompt_hash,
      started_at: options.started_at ?? new Date().toISOString(),
      tags: options.tags,
      metadata: options.metadata
    };

    let sequence = 0;

    const emit = async (
      event: Omit<IngestEventInput, "run_id" | "org_id" | "agent_id" | "source" | "provider" | "model" | "event_id" | "sequence">,
      finalize?: IngestEventsRequest["finalize"]
    ) => {
      sequence += 1;
      return ingestEvents({
        run: baseRun,
        events: [
          {
            event_id: createEventId(),
            run_id: baseRun.run_id,
            org_id: baseRun.org_id,
            agent_id: baseRun.agent_id,
            source: baseRun.source,
            provider: baseRun.provider,
            model: baseRun.model,
            sequence,
            ...event
          }
        ],
        finalize
      });
    };

    const start = async () => {
      return emit({
        type: "RUN_STARTED",
        timestamp: new Date().toISOString(),
        status: "RUNNING"
      });
    };

    const step = async (step_name: string, metadata?: Record<string, unknown>) =>
      emit({
        type: "STEP",
        timestamp: new Date().toISOString(),
        step_name,
        metadata
      });

    const modelCall = async (input_payload: Record<string, unknown>, parameters?: Record<string, unknown>) =>
      emit({
        type: "MODEL_CALL",
        timestamp: new Date().toISOString(),
        step_name: "model_call",
        input_payload,
        parameters
      });

    const modelResult = async (payload: {
      input_tokens?: number;
      output_tokens?: number;
      cost_usd?: number;
      latency_ms?: number;
      status?: string;
      output_payload?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }) =>
      emit({
        type: "MODEL_RESULT",
        timestamp: new Date().toISOString(),
        step_name: "model_result",
        input_tokens: payload.input_tokens,
        output_tokens: payload.output_tokens,
        cost_usd: payload.cost_usd,
        latency_ms: payload.latency_ms,
        status: payload.status ?? "SUCCESS",
        output_payload: payload.output_payload,
        metadata: payload.metadata
      });

    const toolCall = async (payload: {
      tool_name: string;
      tool_action?: string;
      input_payload?: Record<string, unknown>;
      parameters?: Record<string, unknown>;
    }) =>
      emit({
        type: "TOOL_CALL",
        timestamp: new Date().toISOString(),
        tool_name: payload.tool_name,
        tool_action: payload.tool_action,
        input_payload: payload.input_payload,
        parameters: payload.parameters
      });

    const toolResult = async (payload: {
      tool_name: string;
      tool_action?: string;
      output_payload?: Record<string, unknown>;
      cost_usd?: number;
      latency_ms?: number;
      status?: string;
      error_message?: string;
    }) =>
      emit({
        type: "TOOL_RESULT",
        timestamp: new Date().toISOString(),
        tool_name: payload.tool_name,
        tool_action: payload.tool_action,
        output_payload: payload.output_payload,
        cost_usd: payload.cost_usd,
        latency_ms: payload.latency_ms,
        status: payload.status ?? "SUCCESS",
        error_message: payload.error_message
      });

    const approvalRequested = async (metadata?: Record<string, unknown>) =>
      emit({
        type: "APPROVAL_REQUESTED",
        timestamp: new Date().toISOString(),
        status: "PENDING",
        metadata
      });

    const completeRun = async (metadata?: Record<string, unknown>) =>
      emit(
        {
          type: "RUN_COMPLETED",
          timestamp: new Date().toISOString(),
          status: "SUCCESS",
          metadata
        },
        {
          status: "SUCCESS",
          ended_at: new Date().toISOString()
        }
      );

    const failRun = async (error: unknown, metadata?: Record<string, unknown>) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return emit(
        {
          type: "RUN_FAILED",
          timestamp: new Date().toISOString(),
          status: "ERROR",
          error_message: errorMessage,
          metadata
        },
        {
          status: "ERROR",
          ended_at: new Date().toISOString(),
          error_message: errorMessage
        }
      );
    };

    return {
      start,
      step,
      modelCall,
      modelResult,
      toolCall,
      toolResult,
      approvalRequested,
      complete: completeRun,
      fail: failRun
    };
  }

  function createProviderAdapter(
    source: AgentRuntimeSource,
    defaults: {
      provider: string;
      model?: string;
      framework?: string;
      runtime?: string;
      task_name?: string;
    }
  ) {
    return (run_id: string, options?: Partial<TelemetryRunOptions>) =>
      createTelemetryRun({
        run_id,
        source,
        provider: defaults.provider,
        model: defaults.model,
        framework: defaults.framework,
        runtime: defaults.runtime,
        task_name: defaults.task_name,
        ...options
      });
  }

  function wrapFetch(fetchImpl: typeof fetch = fetch) {
    return wrapTool({
      tool_name: "http",
      tool_action: "GET",
      handler: fetchImpl,
      inputSummarizer: (input: RequestInfo | URL) => String(input),
      outputSummarizer: (res: Response) => `status=${res.status}`,
      costEstimator: () => 0.001
    });
  }

  function wrapOpenAITool<TArgs, TResult>(toolName: string, handler: (args: TArgs) => Promise<TResult> | TResult) {
    return wrapTool({
      tool_name: "openai_tool",
      tool_action: toolName,
      handler,
      inputSummarizer: (args: TArgs) => JSON.stringify(args),
      outputSummarizer: (result: TResult) => JSON.stringify(result).slice(0, 1000)
    });
  }

  function wrapLangChainTool<TArgs, TResult>(toolName: string, handler: (args: TArgs) => Promise<TResult> | TResult) {
    return {
      name: toolName,
      invoke: wrapTool({
        tool_name: "langchain_tool",
        tool_action: toolName,
        handler,
        inputSummarizer: (args: TArgs) => JSON.stringify(args),
        outputSummarizer: (result: TResult) => JSON.stringify(result).slice(0, 1000)
      })
    };
  }

  return {
    evaluate,
    evaluateExplain,
    wrapTool,
    wrapFetch,
    wrapOpenAITool,
    wrapLangChainTool,
    ingestEvents,
    createTelemetryRun,
    adapters: {
      openai: createProviderAdapter("OPENAI", { provider: "openai", runtime: "api" }),
      claude: createProviderAdapter("ANTHROPIC", { provider: "anthropic", runtime: "api" }),
      gemini: createProviderAdapter("GEMINI", { provider: "google", runtime: "api" }),
      langchain: createProviderAdapter("LANGCHAIN", { provider: "langchain", framework: "langchain", runtime: "node" })
    }
  };
}

export function createGovernorFromEnv() {
  const api_base_url = process.env.GOVERNOR_API_BASE_URL ?? "http://localhost:4000";
  const org_id = process.env.GOVERNOR_ORG_ID;
  const agent_id = process.env.GOVERNOR_AGENT_ID;

  if (!org_id || !agent_id) {
    throw new Error("GOVERNOR_ORG_ID and GOVERNOR_AGENT_ID are required");
  }

  const envMap: Record<string, EnforcementMode> = { DEV: "DEV", STAGING: "STAGING", PROD: "PROD" };
  const environment = envMap[process.env.GOVERNOR_ENVIRONMENT ?? ""] as EnforcementMode | undefined;

  return createGovernor({
    api_base_url,
    api_key: process.env.GOVERNOR_API_KEY,
    org_id,
    agent_id,
    user_id: process.env.GOVERNOR_USER_ID,
    session_id: process.env.GOVERNOR_SESSION_ID,
    environment,
    on_error: (process.env.GOVERNOR_ON_ERROR as "throw" | "allow" | "deny") || undefined,
  });
}
