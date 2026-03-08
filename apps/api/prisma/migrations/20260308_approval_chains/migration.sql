-- AlterTable
ALTER TABLE "ApprovalPolicy" ADD COLUMN     "approvalChainJson" JSONB,
ADD COLUMN     "autoDenyOnExpiry" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoEscalate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timeoutSeconds" INTEGER NOT NULL DEFAULT 3600;

-- AlterTable
ALTER TABLE "ApprovalRequest" ADD COLUMN     "currentLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "maxLevel" INTEGER NOT NULL DEFAULT 1;

