-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('INC', 'REQ');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('acesso', 'rede_vpn', 'hardware', 'software', 'email', 'outros');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'waiting_analyst', 'approved', 'resolved', 'in_service');

-- CreateEnum
CREATE TYPE "AffectedScope" AS ENUM ('only_me', 'team', 'organization');

-- CreateEnum
CREATE TYPE "DraftOperation" AS ENUM ('create', 'update', 'reopen');

-- CreateEnum
CREATE TYPE "TicketDraftStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'expired');

-- CreateTable
CREATE TABLE "Ticket" (
    "publicId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TicketType" NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "status" "TicketStatus" NOT NULL,
    "affectedScope" "AffectedScope" NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("publicId")
);

-- CreateTable
CREATE TABLE "TicketDraft" (
    "publicId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "operation" "DraftOperation" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "TicketDraftStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketDraft_pkey" PRIMARY KEY ("publicId")
);

-- CreateTable
CREATE TABLE "KnowledgeArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ticket_requesterId_idx" ON "Ticket"("requesterId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "TicketDraft_requesterId_idx" ON "TicketDraft"("requesterId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArticle_slug_key" ON "KnowledgeArticle"("slug");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketDraft" ADD CONSTRAINT "TicketDraft_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- KnowledgeArticle FTS (portuguese)
ALTER TABLE "KnowledgeArticle" ADD COLUMN "search_vector" tsvector;

CREATE OR REPLACE FUNCTION knowledge_article_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('portuguese', coalesce(NEW.title, '') || ' ' || coalesce(NEW.body, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_article_search_vector_update
BEFORE INSERT OR UPDATE OF title, body ON "KnowledgeArticle"
FOR EACH ROW EXECUTE FUNCTION knowledge_article_search_vector_trigger();

CREATE INDEX "KnowledgeArticle_search_vector_idx" ON "KnowledgeArticle" USING GIN ("search_vector");
