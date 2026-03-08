-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "allowedTools" JSONB,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

-- CreateIndex
CREATE INDEX "Agent_orgId_status_idx" ON "Agent"("orgId", "status");
