-- AlterTable: Add firewall tracking to Organization
ALTER TABLE "Organization" ADD COLUMN "firewallInstalledAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('WEBHOOK', 'SLACK');

-- CreateTable
CREATE TABLE "AlertConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "AlertChannel" NOT NULL,
    "alertTypes" JSONB NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertConfig_orgId_idx" ON "AlertConfig"("orgId");

-- AddForeignKey
ALTER TABLE "AlertConfig" ADD CONSTRAINT "AlertConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
