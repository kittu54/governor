-- CreateEnum
CREATE TYPE "MCPAuthType" AS ENUM ('NONE', 'API_KEY', 'BEARER_TOKEN', 'OAUTH');

-- CreateTable
CREATE TABLE "MCPServer" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "description" TEXT,
    "authType" "MCPAuthType" NOT NULL DEFAULT 'NONE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "toolCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MCPServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCPTool" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "description" TEXT,
    "inputSchema" JSONB,
    "riskClass" "RiskClass" NOT NULL DEFAULT 'LOW_RISK',
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MCPTool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MCPServer_orgId_idx" ON "MCPServer"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "MCPServer_orgId_name_key" ON "MCPServer"("orgId", "name");

-- CreateIndex
CREATE INDEX "MCPTool_serverId_idx" ON "MCPTool"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "MCPTool_serverId_toolName_key" ON "MCPTool"("serverId", "toolName");

-- AddForeignKey
ALTER TABLE "MCPServer" ADD CONSTRAINT "MCPServer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPTool" ADD CONSTRAINT "MCPTool_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MCPServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

