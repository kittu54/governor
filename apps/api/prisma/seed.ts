import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV === "production") {
  console.error("Seed script is disabled in production. Set NODE_ENV to development or test to run.");
  process.exit(1);
}

const prisma = new PrismaClient();

const orgs = [
  { id: "org_demo_1", name: "Acme Robotics" },
  { id: "org_demo_2", name: "Northwind Health" },
  { id: "org_demo_3", name: "Atlas Retail" }
];

const agents = [
  {
    id: "agent_support_1", orgId: "org_demo_1", name: "Support Agent",
    description: "Handles customer support tickets, processes refunds, and escalates issues via Slack.",
    status: "ACTIVE" as const,
    framework: "langchain",
    tags: ["support", "tier-1", "production"],
    allowedTools: [{ tool_name: "stripe", tool_action: "refund" }, { tool_name: "slack", tool_action: "post_message" }, { tool_name: "zendesk", tool_action: "*" }]
  },
  {
    id: "agent_finance_1", orgId: "org_demo_1", name: "Finance Agent",
    description: "Reconciles invoices, processes high-value refunds, and generates financial reports.",
    status: "ACTIVE" as const,
    framework: "crewai",
    tags: ["finance", "high-value", "production"],
    allowedTools: [{ tool_name: "stripe", tool_action: "*" }, { tool_name: "salesforce", tool_action: "update_record" }]
  },
  {
    id: "agent_ops_1", orgId: "org_demo_2", name: "Ops Agent",
    description: "Monitors infrastructure, responds to incidents, and manages CRM data syncing.",
    status: "ACTIVE" as const,
    framework: "n8n",
    tags: ["ops", "infra", "production"],
    allowedTools: [{ tool_name: "salesforce", tool_action: "*" }, { tool_name: "github", tool_action: "create_issue" }]
  },
  {
    id: "agent_research_1", orgId: "org_demo_2", name: "Research Agent",
    description: "Performs web research, summarizes findings, and updates knowledge bases.",
    status: "ACTIVE" as const,
    framework: "autogen",
    tags: ["research", "read-only"],
    allowedTools: [{ tool_name: "http", tool_action: "GET" }]
  },
  {
    id: "agent_growth_1", orgId: "org_demo_3", name: "Growth Agent",
    description: "Runs A/B tests, analyzes user funnels, and generates growth experiment reports.",
    status: "ACTIVE" as const,
    framework: "zapier",
    tags: ["growth", "analytics", "production"],
    allowedTools: [{ tool_name: "http", tool_action: "*" }, { tool_name: "slack", tool_action: "post_message" }]
  }
];

const tools = [
  ["stripe", "refund"],
  ["http", "GET"],
  ["slack", "post_message"],
  ["salesforce", "update_record"],
  ["github", "create_issue"]
] as const;

function random<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

async function main() {
  await prisma.agentEvent.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.approvalAction.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.rateLimitPolicy.deleteMany();
  await prisma.budgetLimit.deleteMany();
  await prisma.approvalThreshold.deleteMany();
  await prisma.policyRule.deleteMany();
  await prisma.approvalPolicy.deleteMany();
  await prisma.tool.deleteMany();
  await prisma.policyVersion.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.organization.deleteMany();

  await prisma.organization.createMany({ data: orgs });
  await prisma.agent.createMany({ data: agents });

  await prisma.policyRule.createMany({
    data: [
      {
        orgId: "org_demo_1",
        agentId: "agent_finance_1",
        toolName: "stripe",
        toolAction: "refund",
        effect: "ALLOW",
        priority: 10,
        reason: "Finance refunds allowed"
      },
      {
        orgId: "org_demo_1",
        agentId: null,
        toolName: "stripe",
        toolAction: "refund",
        effect: "DENY",
        priority: 1,
        reason: "Default deny refunds"
      },
      {
        orgId: "org_demo_2",
        agentId: null,
        toolName: "salesforce",
        toolAction: "*",
        effect: "ALLOW",
        priority: 20,
        reason: "CRM updates allowed"
      },
      {
        orgId: "org_demo_3",
        agentId: null,
        toolName: "http",
        toolAction: "*",
        effect: "ALLOW",
        priority: 30,
        reason: "General web retrieval"
      }
    ]
  });

  await prisma.approvalThreshold.createMany({
    data: [
      {
        orgId: "org_demo_1",
        agentId: "agent_finance_1",
        toolName: "stripe",
        toolAction: "refund",
        amountUsd: 50
      },
      {
        orgId: "org_demo_2",
        agentId: null,
        toolName: "salesforce",
        toolAction: "update_record",
        amountUsd: 10
      }
    ]
  });

  await prisma.budgetLimit.createMany({
    data: [
      { orgId: "org_demo_1", agentId: null, dailyLimitUsd: 700 },
      { orgId: "org_demo_1", agentId: "agent_finance_1", dailyLimitUsd: 300 },
      { orgId: "org_demo_2", agentId: null, dailyLimitUsd: 500 },
      { orgId: "org_demo_3", agentId: null, dailyLimitUsd: 1000 }
    ]
  });

  await prisma.rateLimitPolicy.createMany({
    data: [
      { orgId: "org_demo_1", agentId: "agent_finance_1", callsPerMinute: 20 },
      { orgId: "org_demo_2", agentId: null, callsPerMinute: 30 },
      { orgId: "org_demo_3", agentId: null, callsPerMinute: 60 }
    ]
  });

  const now = new Date();
  const auditEvents = Array.from({ length: 2000 }).map((_, i) => {
    const org = random(orgs);
    const orgAgents = agents.filter((agent) => agent.orgId === org.id);
    const agent = random(orgAgents);
    const [toolName, toolAction] = random(tools);
    const decision = random(["ALLOW", "ALLOW", "ALLOW", "DENY", "REQUIRE_APPROVAL"] as const);
    const statusByDecision = {
      ALLOW: random(["SUCCESS", "ERROR", "PENDING"] as const),
      DENY: "DENIED" as const,
      REQUIRE_APPROVAL: "REQUIRES_APPROVAL" as const
    };

    const ts = new Date(now.getTime() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 14));
    const cost = toolName === "stripe" ? Math.round((Math.random() * 100 + 1) * 100) / 100 : Math.round(Math.random() * 5 * 100) / 100;

    return {
      orgId: org.id,
      userId: `user_${(i % 40) + 1}`,
      agentId: agent.id,
      sessionId: `session_${(i % 120) + 1}`,
      toolName,
      toolAction,
      decision,
      status: statusByDecision[decision],
      costEstimateUsd: cost,
      latencyMs: Math.floor(Math.random() * 2000),
      inputSummary: `input-${i}`,
      outputSummary: `output-${i}`,
      errorMessage: statusByDecision[decision] === "ERROR" ? "Transient upstream timeout" : null,
      policyTrace: [
        {
          code: "RULE_MATCH",
          message: "Seed trace",
          metadata: { idx: i }
        }
      ],
      timestamp: ts
    };
  });

  for (let i = 0; i < auditEvents.length; i += 250) {
    await prisma.auditEvent.createMany({ data: auditEvents.slice(i, i + 250) });
  }

  const pendingApprovals = Array.from({ length: 20 }).map((_, i) => {
    const org = random(orgs);
    const orgAgents = agents.filter((agent) => agent.orgId === org.id);
    const agent = random(orgAgents);
    return {
      orgId: org.id,
      userId: `user_${i + 1}`,
      agentId: agent.id,
      sessionId: `session_pending_${i + 1}`,
      toolName: "stripe",
      toolAction: "refund",
      costEstimateUsd: Math.round((Math.random() * 200 + 50) * 100) / 100,
      status: "PENDING" as const,
      trace: [
        {
          code: "REQUIRE_APPROVAL",
          message: "Threshold exceeded",
          metadata: { threshold: 50 }
        }
      ]
    };
  });

  await prisma.approvalRequest.createMany({ data: pendingApprovals });

  const runtimeCatalog = [
    { source: "OPENAI" as const, provider: "openai", models: ["gpt-4.1", "gpt-4.1-mini"] },
    { source: "ANTHROPIC" as const, provider: "anthropic", models: ["claude-sonnet-4", "claude-3-7-sonnet"] },
    { source: "GEMINI" as const, provider: "google", models: ["gemini-2.0-flash", "gemini-2.0-pro"] },
    { source: "LANGCHAIN" as const, provider: "langchain", models: ["router-chain", "react-agent"] }
  ];

  const taskNames = [
    "customer_refund_review",
    "sla_triage",
    "invoice_reconciliation",
    "incident_response",
    "crm_sync",
    "compliance_screening"
  ] as const;

  const runRecords: Array<{
    id: string;
    orgId: string;
    agentId: string;
    sessionId: string;
    userId: string;
    source: "OPENAI" | "ANTHROPIC" | "GEMINI" | "LANGCHAIN";
    provider: string;
    model: string;
    framework: string;
    runtime: string;
    taskName: string;
    status: "RUNNING" | "SUCCESS" | "ERROR" | "CANCELED";
    startedAt: Date;
    endedAt: Date;
    durationMs: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
    totalToolCalls: number;
    errorMessage: string | null;
    riskScore: number;
    tags: string[];
    metadata: Record<string, unknown>;
  }> = [];

  const eventRecords: Array<{
    runId: string;
    orgId: string;
    agentId: string;
    timestamp: Date;
    type:
      | "RUN_STARTED"
      | "RUN_COMPLETED"
      | "RUN_FAILED"
      | "STEP"
      | "MODEL_CALL"
      | "MODEL_RESULT"
      | "TOOL_CALL"
      | "TOOL_RESULT"
      | "APPROVAL_REQUESTED";
    source: "OPENAI" | "ANTHROPIC" | "GEMINI" | "LANGCHAIN";
    provider: string;
    model: string;
    stepName?: string;
    toolName?: string;
    toolAction?: string;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
    latencyMs?: number;
    status?: string;
    errorMessage?: string | null;
    sequence: number;
    inputPayload?: Record<string, unknown>;
    outputPayload?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }> = [];

  const runCount = 450;
  for (let i = 0; i < runCount; i += 1) {
    const org = random(orgs);
    const orgAgents = agents.filter((agent) => agent.orgId === org.id);
    const agent = random(orgAgents);
    const runtime = random(runtimeCatalog);
    const model = random(runtime.models);
    const taskName = random(taskNames);
    const status = random(["SUCCESS", "SUCCESS", "SUCCESS", "ERROR"] as const);
    const startedAt = new Date(now.getTime() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 14));
    const durationMs = Math.floor(500 + Math.random() * 30000);
    const endedAt = new Date(startedAt.getTime() + durationMs);
    const inputTokens = Math.floor(200 + Math.random() * 6000);
    const outputTokens = Math.floor(80 + Math.random() * 2400);
    const toolCalls = Math.floor(Math.random() * 5);
    const tokenCost = Number((((inputTokens + outputTokens) / 1000) * (runtime.source === "OPENAI" ? 0.008 : 0.006)).toFixed(4));
    const toolCost = Number((toolCalls * (0.001 + Math.random() * 0.01)).toFixed(4));
    const totalCost = Number((tokenCost + toolCost).toFixed(4));
    const runId = `run_${i + 1}`;
    const sessionId = `run_session_${(i % 120) + 1}`;

    runRecords.push({
      id: runId,
      orgId: org.id,
      agentId: agent.id,
      sessionId,
      userId: `user_${(i % 70) + 1}`,
      source: runtime.source,
      provider: runtime.provider,
      model,
      framework: runtime.source === "LANGCHAIN" ? "langchain" : "native-sdk",
      runtime: runtime.source === "LANGCHAIN" ? "node" : "api",
      taskName,
      status,
      startedAt,
      endedAt,
      durationMs,
      totalInputTokens: inputTokens,
      totalOutputTokens: outputTokens,
      totalCostUsd: totalCost,
      totalToolCalls: toolCalls,
      errorMessage: status === "ERROR" ? "Upstream model timeout at step 3" : null,
      riskScore: Number((Math.random() * 0.8 + (status === "ERROR" ? 0.2 : 0)).toFixed(3)),
      tags: status === "ERROR" ? ["incident", "high-priority"] : ["normal"],
      metadata: {
        environment: "production",
        region: random(["us-east-1", "us-west-2", "eu-west-1"] as const),
        sdk_version: "0.1.0"
      }
    });

    let sequence = 1;
    eventRecords.push({
      runId,
      orgId: org.id,
      agentId: agent.id,
      timestamp: startedAt,
      type: "RUN_STARTED",
      source: runtime.source,
      provider: runtime.provider,
      model,
      status: "RUNNING",
      sequence,
      metadata: { task_name: taskName }
    });

    sequence += 1;
    eventRecords.push({
      runId,
      orgId: org.id,
      agentId: agent.id,
      timestamp: new Date(startedAt.getTime() + 150),
      type: "MODEL_CALL",
      source: runtime.source,
      provider: runtime.provider,
      model,
      stepName: "reasoning",
      sequence,
      inputPayload: { instruction: `Execute ${taskName}` },
      parameters: { temperature: 0.2, max_tokens: 2048 }
    });

    sequence += 1;
    eventRecords.push({
      runId,
      orgId: org.id,
      agentId: agent.id,
      timestamp: new Date(startedAt.getTime() + 600),
      type: "MODEL_RESULT",
      source: runtime.source,
      provider: runtime.provider,
      model,
      stepName: "reasoning",
      inputTokens,
      outputTokens,
      costUsd: tokenCost,
      latencyMs: Math.floor(durationMs * 0.35),
      status: status === "ERROR" ? "PARTIAL" : "SUCCESS",
      sequence,
      outputPayload: { summary: `${taskName} intermediate output` }
    });

    for (let call = 0; call < toolCalls; call += 1) {
      const [toolName, toolAction] = random(tools);

      sequence += 1;
      eventRecords.push({
        runId,
        orgId: org.id,
        agentId: agent.id,
        timestamp: new Date(startedAt.getTime() + 700 + call * 350),
        type: "TOOL_CALL",
        source: runtime.source,
        provider: runtime.provider,
        model,
        toolName,
        toolAction,
        sequence,
        parameters: { retry: 0 }
      });

      sequence += 1;
      eventRecords.push({
        runId,
        orgId: org.id,
        agentId: agent.id,
        timestamp: new Date(startedAt.getTime() + 900 + call * 350),
        type: "TOOL_RESULT",
        source: runtime.source,
        provider: runtime.provider,
        model,
        toolName,
        toolAction,
        costUsd: Number((toolCost / Math.max(toolCalls, 1)).toFixed(4)),
        latencyMs: Math.floor(100 + Math.random() * 800),
        status: "SUCCESS",
        sequence,
        outputPayload: { ok: true }
      });
    }

    sequence += 1;
    eventRecords.push({
      runId,
      orgId: org.id,
      agentId: agent.id,
      timestamp: endedAt,
      type: status === "ERROR" ? "RUN_FAILED" : "RUN_COMPLETED",
      source: runtime.source,
      provider: runtime.provider,
      model,
      status: status === "ERROR" ? "ERROR" : "SUCCESS",
      errorMessage: status === "ERROR" ? "Upstream model timeout at step 3" : null,
      latencyMs: durationMs,
      sequence,
      metadata: { total_tool_calls: toolCalls }
    });
  }

  for (let i = 0; i < runRecords.length; i += 200) {
    await prisma.agentRun.createMany({ data: runRecords.slice(i, i + 200) as any });
  }

  for (let i = 0; i < eventRecords.length; i += 500) {
    await prisma.agentEvent.createMany({ data: eventRecords.slice(i, i + 500) as any });
  }

  // ─── Tool Registry ──────────────────────────────────────────
  const toolRegistry = [
    { orgId: "org_demo_1", toolName: "stripe", toolAction: "refund", displayName: "Stripe Refund", description: "Process customer refunds via Stripe API", riskClass: "MONEY_MOVEMENT" as const, isSensitive: true },
    { orgId: "org_demo_1", toolName: "stripe", toolAction: "charge", displayName: "Stripe Charge", description: "Create payment charges", riskClass: "MONEY_MOVEMENT" as const, isSensitive: true },
    { orgId: "org_demo_1", toolName: "gmail", toolAction: "send", displayName: "Send Email", description: "Send outbound email via Gmail API", riskClass: "EXTERNAL_COMMUNICATION" as const, isSensitive: true },
    { orgId: "org_demo_1", toolName: "zendesk", toolAction: "close", displayName: "Close Ticket", description: "Close a Zendesk support ticket", riskClass: "DATA_WRITE" as const, isSensitive: false },
    { orgId: "org_demo_1", toolName: "zendesk", toolAction: "delete", displayName: "Delete Ticket", description: "Permanently delete a support ticket", riskClass: "DATA_WRITE" as const, isSensitive: true },
    { orgId: "org_demo_1", toolName: "postgres", toolAction: "update", displayName: "Database Update", description: "Update records in PostgreSQL", riskClass: "DATA_WRITE" as const, isSensitive: true },
    { orgId: "org_demo_1", toolName: "s3", toolAction: "export", displayName: "S3 Export", description: "Export data to S3 bucket", riskClass: "DATA_EXPORT" as const, isSensitive: true },
    { orgId: "org_demo_1", toolName: "shell", toolAction: "exec", displayName: "Shell Execute", description: "Execute shell commands", riskClass: "CODE_EXECUTION" as const, isSensitive: true },
    { orgId: "org_demo_1", toolName: "fs", toolAction: "delete", displayName: "File Delete", description: "Delete files from filesystem", riskClass: "FILE_MUTATION" as const, isSensitive: true },
    { orgId: "org_demo_1", toolName: "vault", toolAction: "read", displayName: "Vault Read", description: "Read secrets from Vault", riskClass: "CREDENTIAL_USE" as const, isSensitive: true },
    { orgId: "org_demo_1", toolName: "customer", toolAction: "lookup", displayName: "Customer Lookup", description: "Look up customer PII", riskClass: "PII_ACCESS" as const, isSensitive: true },
    { orgId: "org_demo_1", toolName: "iam", toolAction: "grant", displayName: "Grant IAM Role", description: "Grant IAM permissions", riskClass: "ADMIN_ACTION" as const, isSensitive: true },
    { orgId: "org_demo_1", toolName: "slack", toolAction: "send", displayName: "Slack Message", description: "Send Slack channel message", riskClass: "EXTERNAL_COMMUNICATION" as const, isSensitive: false },
    { orgId: "org_demo_1", toolName: "http", toolAction: "GET", displayName: "HTTP GET", description: "Read-only HTTP request", riskClass: "LOW_RISK" as const, isSensitive: false },
  ];

  for (const tool of toolRegistry) {
    await prisma.tool.upsert({
      where: { orgId_toolName_toolAction: { orgId: tool.orgId, toolName: tool.toolName, toolAction: tool.toolAction } },
      create: tool,
      update: tool,
    });
  }

  // ─── Approval Policies ─────────────────────────────────────
  await prisma.approvalPolicy.createMany({
    data: [
      { orgId: "org_demo_1", name: "Money Movement Approval", riskClass: "MONEY_MOVEMENT", requiresReason: true, autoExpireSeconds: 3600 },
      { orgId: "org_demo_1", name: "Data Export Approval", riskClass: "DATA_EXPORT", thresholdUsd: 0, requiresReason: true, autoExpireSeconds: 7200 },
      { orgId: "org_demo_1", name: "Admin Actions Approval", riskClass: "ADMIN_ACTION", requiresReason: true, autoExpireSeconds: 1800 },
    ],
    skipDuplicates: true,
  });

  // ─── V2 Policies (Policy Packs) ────────────────────────────
  const policyPacks = [
    {
      name: "Customer Support Controls",
      description: "Governance rules for customer-facing support agents: refund limits, email review, and PII access controls.",
      enforcementMode: "PROD",
      definition: {
        rules: [
          { name: "block-high-refunds", description: "Deny refunds over $500 without approval", effect: "DENY", priority: 10, subjects: [{ type: "tool", value: "stripe.refund" }], conditions: [{ field: "cost_estimate_usd", operator: "greater_than", value: 500 }], reason: "Refunds over $500 need manager approval" },
          { name: "require-approval-external-email", description: "Require approval for sending external emails", effect: "DENY", priority: 20, subjects: [{ type: "tool", value: "gmail.send" }], reason: "External communications require human review" },
          { name: "allow-ticket-ops", description: "Allow standard ticket operations", effect: "ALLOW", priority: 100, subjects: [{ type: "tool", value: "zendesk.close" }, { type: "tool", value: "zendesk.update" }] },
          { name: "block-ticket-delete", description: "Prevent permanent ticket deletion", effect: "DENY", priority: 5, subjects: [{ type: "tool", value: "zendesk.delete" }], reason: "Permanent deletion is not allowed in production" },
        ],
      },
    },
    {
      name: "Finance Operations",
      description: "Strict controls for finance and payment processing agents: all money movement requires approval, spend caps enforced.",
      enforcementMode: "PROD",
      definition: {
        rules: [
          { name: "approve-all-charges", description: "All payment charges require approval", effect: "DENY", priority: 5, subjects: [{ type: "tool", value: "stripe.charge" }], reason: "All charges must be approved by a human operator" },
          { name: "approve-refunds-over-100", description: "Refunds over $100 need approval", effect: "DENY", priority: 10, subjects: [{ type: "tool", value: "stripe.refund" }], conditions: [{ field: "cost_estimate_usd", operator: "greater_than", value: 100 }], reason: "Finance policy: refunds above $100 need approval" },
          { name: "block-db-mutations", description: "Block direct database mutations", effect: "DENY", priority: 5, subjects: [{ type: "tool", value: "postgres.update" }, { type: "tool", value: "postgres.delete" }], reason: "Direct DB mutations are blocked in PROD" },
          { name: "allow-read-only", description: "Allow all read operations", effect: "ALLOW", priority: 200, subjects: [{ type: "tool_action", value: "read" }, { type: "tool_action", value: "GET" }, { type: "tool_action", value: "list" }] },
        ],
      },
    },
    {
      name: "Development Sandbox",
      description: "Permissive policy for development and testing environments. Logs all actions but allows most operations.",
      enforcementMode: "DEV",
      definition: {
        rules: [
          { name: "block-prod-credentials", description: "Block access to production credentials even in dev", effect: "DENY", priority: 1, subjects: [{ type: "tool", value: "vault.read" }], conditions: [{ field: "metadata.env", operator: "equals", value: "production" }], reason: "Production credentials are never accessible in dev" },
          { name: "allow-everything-else", description: "Allow all other operations for development", effect: "ALLOW", priority: 999, subjects: [{ type: "tool_action", value: "*" }] },
        ],
      },
    },
  ];

  for (const pack of policyPacks) {
    const policy = await prisma.policy.create({
      data: {
        orgId: "org_demo_1",
        name: pack.name,
        description: pack.description,
        enforcementMode: pack.enforcementMode as any,
        status: "DRAFT",
      },
    });

    const checksum = Math.random().toString(36).slice(2, 18);

    const version = await prisma.policyVersion.create({
      data: {
        policyId: policy.id,
        versionNumber: 1,
        definitionJson: pack.definition as any,
        checksum,
        changeSummary: "Initial version",
        createdBy: "seed",
      },
    });

    await prisma.policy.update({
      where: { id: policy.id },
      data: {
        currentVersionId: version.id,
        status: "PUBLISHED",
      },
    });

    await prisma.policyVersion.update({
      where: { id: version.id },
      data: { isPublished: true },
    });
  }

  // ─── Audit Log Entries (for seeded actions) ────────────────
  await prisma.auditLog.createMany({
    data: [
      { orgId: "org_demo_1", actorType: "SYSTEM", eventType: "seed.completed", entityType: "Organization", entityId: "org_demo_1", summary: "Database seeded with demo data" },
      { orgId: "org_demo_1", actorType: "USER", actorId: "admin", eventType: "policy.created", entityType: "Policy", summary: "Created Customer Support Controls policy" },
      { orgId: "org_demo_1", actorType: "USER", actorId: "admin", eventType: "policy.created", entityType: "Policy", summary: "Created Finance Operations policy" },
      { orgId: "org_demo_1", actorType: "USER", actorId: "admin", eventType: "tool.registered", entityType: "Tool", summary: "Registered 14 tools in the tool registry" },
      { orgId: "org_demo_1", actorType: "SYSTEM", eventType: "policy_version.published", entityType: "PolicyVersion", summary: "Published v1 of Customer Support Controls" },
      { orgId: "org_demo_1", actorType: "SYSTEM", eventType: "policy_version.published", entityType: "PolicyVersion", summary: "Published v1 of Finance Operations" },
      { orgId: "org_demo_1", actorType: "SYSTEM", eventType: "agent.registered", entityType: "Agent", entityId: "agent_support_1", summary: "Registered Support Agent" },
      { orgId: "org_demo_1", actorType: "SYSTEM", eventType: "agent.registered", entityType: "Agent", entityId: "agent_finance_1", summary: "Registered Finance Agent" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed completed with demo tenants, agents, audits, approvals, runs, events, tools, policies, and policy packs");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
