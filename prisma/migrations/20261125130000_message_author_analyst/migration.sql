-- G2 handoff: identificar qual analista enviou cada mensagem no chat da funcionária.
ALTER TABLE "Message" ADD COLUMN "authorUserId" TEXT;

ALTER TABLE "Message" ADD CONSTRAINT "Message_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;