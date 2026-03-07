-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('ALLOW', 'DENY', 'REQUIRE_APPROVAL');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('PENDING', 'SUCCESS', 'ERROR', 'DENIED', 'REQUIRES_APPROVAL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "PolicyEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "agentId" TEXT,
    "toolName" TEXT NOT NULL,
    "toolAction" TEXT NOT NULL,
    "effect" "PolicyEffect" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalThreshold" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "agentId" TEXT,
    "toolName" TEXT NOT NULL,
    "toolAction" TEXT NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLimit" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "agentId" TEXT,
    "dailyLimitUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitPolicy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "agentId" TEXT,
    "callsPerMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "agentId" TEXT NOT NULL,
    "sessionId" TEXT,
    "toolName" TEXT NOT NULL,
    "toolAction" TEXT NOT NULL,
    "decision" "Decision" NOT NULL,
    "costEstimateUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "status" "AuditStatus" NOT NULL,
    "policyTrace" JSONB NOT NULL,
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "agentId" TEXT NOT NULL,
    "sessionId" TEXT,
    "toolName" TEXT NOT NULL,
    "toolAction" TEXT NOT NULL,
    "costEstimateUsd" DOUBLE PRECISION NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "trace" JSONB NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agent_orgId_idx" ON "Agent"("orgId");

-- CreateIndex
CREATE INDEX "PolicyRule_orgId_agentId_idx" ON "PolicyRule"("orgId", "agentId");

-- CreateIndex
CREATE INDEX "ApprovalThreshold_orgId_agentId_idx" ON "ApprovalThreshold"("orgId", "agentId");

-- CreateIndex
CREATE INDEX "BudgetLimit_orgId_agentId_idx" ON "BudgetLimit"("orgId", "agentId");

-- CreateIndex
CREATE INDEX "RateLimitPolicy_orgId_agentId_idx" ON "RateLimitPolicy"("orgId", "agentId");

-- CreateIndex
CREATE INDEX "AuditEvent_orgId_timestamp_idx" ON "AuditEvent"("orgId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditEvent_agentId_timestamp_idx" ON "AuditEvent"("agentId", "timestamp");

-- CreateIndex
CREATE INDEX "ApprovalRequest_orgId_status_requestedAt_idx" ON "ApprovalRequest"("orgId", "status", "requestedAt");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRule" ADD CONSTRAINT "PolicyRule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalThreshold" ADD CONSTRAINT "ApprovalThreshold_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLimit" ADD CONSTRAINT "BudgetLimit_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLimitPolicy" ADD CONSTRAINT "RateLimitPolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
