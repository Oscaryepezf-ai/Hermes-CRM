-- CreateEnum
CREATE TYPE "ReactivationSegment" AS ENUM ('TRATAMIENTO_INCOMPLETO', 'CONTROL_PENDIENTE', 'LARGO_PLAZO_INACTIVO', 'PERDIO_PRESUPUESTO', 'SIN_CLASIFICAR');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('PENDING', 'ACTIVE', 'RESPONDED', 'CONVERTED', 'EXHAUSTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "AgentConversation" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "reactivadorActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reactivadorConfig" JSONB;

-- AlterTable
ALTER TABLE "ClinicChannel" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SocialProfile" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ReactivationCampaign" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "segment" "ReactivationSegment" NOT NULL,
    "treatmentFocus" TEXT,
    "daysSinceLastAppt" INTEGER NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "respondedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "revenue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReactivationCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMessage" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "channel" "MarketingChannel" NOT NULL,
    "content" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "externalMsgId" TEXT,

    CONSTRAINT "CampaignMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReactivationCampaign_clinicId_status_idx" ON "ReactivationCampaign"("clinicId", "status");

-- CreateIndex
CREATE INDEX "ReactivationCampaign_nextAttemptAt_idx" ON "ReactivationCampaign"("nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReactivationCampaign_clinicId_leadId_key" ON "ReactivationCampaign"("clinicId", "leadId");

-- AddForeignKey
ALTER TABLE "ReactivationCampaign" ADD CONSTRAINT "ReactivationCampaign_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReactivationCampaign" ADD CONSTRAINT "ReactivationCampaign_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMessage" ADD CONSTRAINT "CampaignMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ReactivationCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
