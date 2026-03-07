import type {
  AgentRuntimeSource,
  EvaluateRequest,
  EvaluateResponse,
  IngestEventInput,
  IngestEventsRequest,
  IngestEventsResponse
} from "@governor/shared";

export interface GovernorClientConfig {
  api_base_url: string;
  api_key?: string;
  org_id: string;
  user_id?: string;
  agent_id: string;
  session_id?: string;
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
  constructor(message: string, public readonly trace: unknown[]) {
    super(message);
    this.name = "GovernorDeniedError";
  }
}

export class GovernorApprovalRequiredError extends Error {
  constructor(message: string, public readonly approval_request_id: string | undefined, public readonly trace: unknown[]) {
    super(message);
    this.name = "GovernorApprovalRequiredError";
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

export function createGovernor(config: GovernorClientConfig) {
  async function evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
    const response = await fetch(joinUrl(config.api_base_url, "/v1/evaluate"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.api_key ? { authorization: `Bearer ${config.api_key}` } : {})
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Governor evaluate failed: ${response.status}`);
    }

    return (await response.json()) as EvaluateResponse;
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

      const evaluation = await evaluate({
        org_id: config.org_id,
        user_id: config.user_id,
        agent_id: config.agent_id,
        session_id: config.session_id,
        tool_name: options.tool_name,
        tool_action: options.tool_action,
        cost_estimate_usd,
        input_summary
      });

      if (evaluation.decision === "DENY") {
        throw new GovernorDeniedError("Tool invocation denied by Governor policy", evaluation.trace);
      }

      if (evaluation.decision === "REQUIRE_APPROVAL") {
        throw new GovernorApprovalRequiredError(
          "Tool invocation requires approval",
          evaluation.approval_request_id,
          evaluation.trace
        );
      }

      try {
        const result = await options.handler(...args);
        await complete(evaluation.request_id, {
          status: "SUCCESS",
          latency_ms: Math.round(performance.now() - startedAt),
          output_summary: options.outputSummarizer?.(result)
        });
        return result;
      } catch (error) {
        await complete(evaluation.request_id, {
          status: "ERROR",
          latency_ms: Math.round(performance.now() - startedAt),
          error_message: error instanceof Error ? error.message : "Unknown error"
        });
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

  return createGovernor({
    api_base_url,
    api_key: process.env.GOVERNOR_API_KEY,
    org_id,
    agent_id,
    user_id: process.env.GOVERNOR_USER_ID,
    session_id: process.env.GOVERNOR_SESSION_ID
  });
}
