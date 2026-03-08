-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventSource" ADD VALUE 'ZAPIER';
ALTER TYPE "EventSource" ADD VALUE 'MINDSTUDIO';
ALTER TYPE "EventSource" ADD VALUE 'LINDY';
ALTER TYPE "EventSource" ADD VALUE 'AGENTGPT';
ALTER TYPE "EventSource" ADD VALUE 'RELEVANCE_AI';
ALTER TYPE "EventSource" ADD VALUE 'COPILOT_STUDIO';
ALTER TYPE "EventSource" ADD VALUE 'VERTEX_AI';
ALTER TYPE "EventSource" ADD VALUE 'AGENTFORCE';
ALTER TYPE "EventSource" ADD VALUE 'WATSONX';
ALTER TYPE "EventSource" ADD VALUE 'CREWAI';
ALTER TYPE "EventSource" ADD VALUE 'AUTOGEN';
ALTER TYPE "EventSource" ADD VALUE 'PYDANTIC_AI';
ALTER TYPE "EventSource" ADD VALUE 'N8N';
ALTER TYPE "EventSource" ADD VALUE 'MAKE';
ALTER TYPE "EventSource" ADD VALUE 'WEBHOOK';

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "framework" TEXT;

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "framework" TEXT,
    "scopes" JSONB,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_orgId_idx" ON "ApiKey"("orgId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "Agent_orgId_framework_idx" ON "Agent"("orgId", "framework");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
