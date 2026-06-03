-- CreateEnum
CREATE TYPE "InboxStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isNote" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PipelineStage" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "InboxConversation" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" "MarketingChannel" NOT NULL,
    "status" "InboxStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" VARCHAR(200),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxLabel" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "emoji" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxConversationLabel" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxConversationLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboxConversation_clinicId_status_lastMessageAt_idx" ON "InboxConversation"("clinicId", "status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "InboxConversation_clinicId_isRead_idx" ON "InboxConversation"("clinicId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "InboxConversation_leadId_channel_key" ON "InboxConversation"("leadId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "InboxLabel_clinicId_name_key" ON "InboxLabel"("clinicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "InboxConversationLabel_conversationId_labelId_key" ON "InboxConversationLabel"("conversationId", "labelId");

-- AddForeignKey
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxLabel" ADD CONSTRAINT "InboxLabel_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxConversationLabel" ADD CONSTRAINT "InboxConversationLabel_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxConversationLabel" ADD CONSTRAINT "InboxConversationLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "InboxLabel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
