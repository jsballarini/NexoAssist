-- CreateTable
CREATE TABLE "AgentTrace" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "understanding" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "confidence" INTEGER NOT NULL,
    "rulesFired" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "rawToolCalls" JSONB,

    CONSTRAINT "AgentTrace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentTrace_messageId_key" ON "AgentTrace"("messageId");

-- AddForeignKey
ALTER TABLE "AgentTrace" ADD CONSTRAINT "AgentTrace_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;