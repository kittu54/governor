-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'ERROR', 'CANCELED');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI', 'LANGCHAIN', 'MCP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AgentEventType" AS ENUM ('RUN_STARTED', 'RUN_COMPLETED', 'RUN_FAILED', 'STEP', 'MODEL_CALL', 'MODEL_RESULT', 'TOOL_CALL', 'TOOL_RESULT', 'APPROVAL_REQUESTED');

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "source" "EventSource" NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "framework" TEXT,
    "runtime" TEXT,
    "taskName" TEXT,
    "promptHash" TEXT,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalToolCalls" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "riskScore" DOUBLE PRECISION,
    "tags" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEvent" (
    "id" TEXT NOT NULL,
    "externalEventId" TEXT,
    "runId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "AgentEventType" NOT NULL,
    "source" "EventSource" NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "stepName" TEXT,
    "toolName" TEXT,
    "toolAction" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "status" TEXT,
    "errorMessage" TEXT,
    "sequence" INTEGER,
    "inputPayload" JSONB,
    "outputPayload" JSONB,
    "parameters" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentRun_orgId_startedAt_idx" ON "AgentRun"("orgId", "startedAt");

-- CreateIndex
CREATE INDEX "AgentRun_agentId_startedAt_idx" ON "AgentRun"("agentId", "startedAt");

-- CreateIndex
CREATE INDEX "AgentRun_status_startedAt_idx" ON "AgentRun"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentEvent_externalEventId_key" ON "AgentEvent"("externalEventId");

-- CreateIndex
CREATE INDEX "AgentEvent_runId_timestamp_idx" ON "AgentEvent"("runId", "timestamp");

-- CreateIndex
CREATE INDEX "AgentEvent_orgId_timestamp_idx" ON "AgentEvent"("orgId", "timestamp");

-- CreateIndex
CREATE INDEX "AgentEvent_agentId_timestamp_idx" ON "AgentEvent"("agentId", "timestamp");

-- CreateIndex
CREATE INDEX "AgentEvent_type_timestamp_idx" ON "AgentEvent"("type", "timestamp");

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
