-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('CAPTADOR', 'AGENDADOR', 'REACTIVADOR');
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'HANDED_OFF', 'COMPLETED', 'ABANDONED');

-- AlterTable Clinic
ALTER TABLE "Clinic" ADD COLUMN "captadorActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Clinic" ADD COLUMN "captadorConfig"  JSONB;

-- AlterTable Lead
ALTER TABLE "Lead" ADD COLUMN "isAgentHandled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Message
ALTER TABLE "Message" ADD COLUMN "isAutomatic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable AgentConversation
CREATE TABLE "AgentConversation" (
    "id"             TEXT NOT NULL,
    "leadId"         TEXT NOT NULL,
    "agentType"      "AgentType" NOT NULL DEFAULT 'CAPTADOR',
    "status"         "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "channel"        "MarketingChannel" NOT NULL,
    "turnCount"      INTEGER NOT NULL DEFAULT 0,
    "lastAgentMsgAt" TIMESTAMP(3),
    "handedOffAt"    TIMESTAMP(3),
    "handoffReason"  TEXT,
    "collectedData"  JSONB NOT NULL DEFAULT '{}',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentConversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentConversation_leadId_key" ON "AgentConversation"("leadId");

ALTER TABLE "AgentConversation" ADD CONSTRAINT "AgentConversation_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
