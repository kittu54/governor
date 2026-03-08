-- CreateEnum
CREATE TYPE "RiskClass" AS ENUM ('MONEY_MOVEMENT', 'EXTERNAL_COMMUNICATION', 'DATA_EXPORT', 'DATA_WRITE', 'CODE_EXECUTION', 'FILE_MUTATION', 'CREDENTIAL_USE', 'PII_ACCESS', 'ADMIN_ACTION', 'LOW_RISK');

-- CreateEnum
CREATE TYPE "EnforcementMode" AS ENUM ('DEV', 'STAGING', 'PROD');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('ORG', 'AGENT', 'TOOL', 'RISK_CLASS');

-- CreateEnum
CREATE TYPE "ApprovalActionType" AS ENUM ('APPROVE', 'DENY', 'ESCALATE', 'COMMENT');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('SYSTEM', 'USER', 'AGENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApprovalStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "ApprovalStatus" ADD VALUE 'CANCELED';

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "environment" "EnforcementMode" NOT NULL DEFAULT 'DEV',
ADD COLUMN     "provider" TEXT;

-- AlterTable
ALTER TABLE "ApprovalRequest" ADD COLUMN     "evaluationId" TEXT,
ADD COLUMN     "evidenceJson" JSONB,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "riskClass" "RiskClass",
ADD COLUMN     "runId" TEXT;

-- AlterTable
ALTER TABLE "ApprovalThreshold" ADD COLUMN     "riskClass" "RiskClass";

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "defaultMode" "EnforcementMode" NOT NULL DEFAULT 'DEV',
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PolicyRule" ADD COLUMN     "conditions" JSONB,
ADD COLUMN     "riskClass" "RiskClass";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "toolAction" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "riskClass" "RiskClass" NOT NULL DEFAULT 'LOW_RISK',
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "enforcementMode" "EnforcementMode" NOT NULL DEFAULT 'DEV',
    "createdBy" TEXT,
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyVersion" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "definitionJson" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "changeSummary" TEXT,
    "createdBy" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "scopeType" "ScopeType" NOT NULL DEFAULT 'ORG',
    "scopeId" TEXT,
    "period" "BudgetPeriod" NOT NULL DEFAULT 'DAILY',
    "limitUsd" DOUBLE PRECISION NOT NULL,
    "warnAtUsd" DOUBLE PRECISION,
    "hardStop" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "scopeType" "ScopeType" NOT NULL DEFAULT 'ORG',
    "scopeId" TEXT,
    "windowSeconds" INTEGER NOT NULL DEFAULT 60,
    "maxCalls" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalPolicy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "riskClass" "RiskClass",
    "toolName" TEXT,
    "toolAction" TEXT,
    "thresholdUsd" DOUBLE PRECISION,
    "requiresReason" BOOLEAN NOT NULL DEFAULT false,
    "autoExpireSeconds" INTEGER NOT NULL DEFAULT 3600,
    "escalationPolicyJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalAction" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "ApprovalActionType" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "runId" TEXT,
    "toolName" TEXT NOT NULL,
    "toolAction" TEXT NOT NULL,
    "riskClass" "RiskClass",
    "decision" "Decision" NOT NULL,
    "enforcementMode" "EnforcementMode" NOT NULL,
    "costEstimateUsd" DOUBLE PRECISION,
    "matchedPolicyVersionId" TEXT,
    "matchedRuleId" TEXT,
    "traceJson" JSONB NOT NULL,
    "inputFactsJson" JSONB,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorId" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "payload" JSONB,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "eventTypes" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastDeliveryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "User_orgId_email_key" ON "User"("orgId", "email");

-- CreateIndex
CREATE INDEX "Tool_orgId_idx" ON "Tool"("orgId");

-- CreateIndex
CREATE INDEX "Tool_orgId_riskClass_idx" ON "Tool"("orgId", "riskClass");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_orgId_toolName_toolAction_key" ON "Tool"("orgId", "toolName", "toolAction");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_currentVersionId_key" ON "Policy"("currentVersionId");

-- CreateIndex
CREATE INDEX "Policy_orgId_idx" ON "Policy"("orgId");

-- CreateIndex
CREATE INDEX "Policy_orgId_status_idx" ON "Policy"("orgId", "status");

-- CreateIndex
CREATE INDEX "PolicyVersion_policyId_idx" ON "PolicyVersion"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyVersion_policyId_versionNumber_key" ON "PolicyVersion"("policyId", "versionNumber");

-- CreateIndex
CREATE INDEX "Budget_orgId_idx" ON "Budget"("orgId");

-- CreateIndex
CREATE INDEX "Budget_orgId_scopeType_scopeId_idx" ON "Budget"("orgId", "scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "RateLimit_orgId_idx" ON "RateLimit"("orgId");

-- CreateIndex
CREATE INDEX "RateLimit_orgId_scopeType_scopeId_idx" ON "RateLimit"("orgId", "scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "ApprovalPolicy_orgId_idx" ON "ApprovalPolicy"("orgId");

-- CreateIndex
CREATE INDEX "ApprovalAction_approvalRequestId_idx" ON "ApprovalAction"("approvalRequestId");

-- CreateIndex
CREATE INDEX "Evaluation_orgId_createdAt_idx" ON "Evaluation"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Evaluation_agentId_createdAt_idx" ON "Evaluation"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "Evaluation_orgId_riskClass_idx" ON "Evaluation"("orgId", "riskClass");

-- CreateIndex
CREATE INDEX "Evaluation_orgId_decision_idx" ON "Evaluation"("orgId", "decision");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_entityType_entityId_idx" ON "AuditLog"("orgId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_eventType_idx" ON "AuditLog"("orgId", "eventType");

-- CreateIndex
CREATE INDEX "Webhook_orgId_idx" ON "Webhook"("orgId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_agentId_status_idx" ON "ApprovalRequest"("agentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "PolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyVersion" ADD CONSTRAINT "PolicyVersion_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLimit" ADD CONSTRAINT "RateLimit_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalPolicy" ADD CONSTRAINT "ApprovalPolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_matchedPolicyVersionId_fkey" FOREIGN KEY ("matchedPolicyVersionId") REFERENCES "PolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

