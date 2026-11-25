-- AlterTable
ALTER TABLE "AgentTrace" ADD COLUMN "reasoning" TEXT NOT NULL DEFAULT '',
ADD COLUMN "usage" JSONB;
