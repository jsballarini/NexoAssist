-- CreateIndex
CREATE INDEX "Ticket_requesterId_status_resolvedAt_idx" ON "Ticket"("requesterId", "status", "resolvedAt");