-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "handoffSummary" JSONB;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "transferReason" TEXT;

-- CreateTable
CREATE TABLE "TicketUpdate" (
    "id" TEXT NOT NULL,
    "ticketPublicId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketUpdate_ticketPublicId_createdAt_idx" ON "TicketUpdate"("ticketPublicId", "createdAt");

-- AddForeignKey
ALTER TABLE "TicketUpdate" ADD CONSTRAINT "TicketUpdate_ticketPublicId_fkey" FOREIGN KEY ("ticketPublicId") REFERENCES "Ticket"("publicId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketUpdate" ADD CONSTRAINT "TicketUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
