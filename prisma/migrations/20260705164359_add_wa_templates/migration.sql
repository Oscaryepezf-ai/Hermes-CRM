-- CreateEnum
CREATE TYPE "WaTemplateCategory" AS ENUM ('MARKETING', 'UTILITY', 'AUTHENTICATION');
-- CreateEnum
CREATE TYPE "WaTemplateStatus" AS ENUM ('BORRADOR', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'PAUSADA');
-- CreateEnum
CREATE TYPE "WaHeaderType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT');
-- CreateEnum
CREATE TYPE "WaCampaignStatus" AS ENUM ('BORRADOR', 'PROGRAMADA', 'ENVIANDO', 'COMPLETADA', 'CANCELADA');
-- CreateEnum
CREATE TYPE "WaSendStatus" AS ENUM ('PENDIENTE', 'ENVIADO', 'ENTREGADO', 'FALLIDO');
-- CreateTable
CREATE TABLE "WaTemplate" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "WaTemplateCategory" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "status" "WaTemplateStatus" NOT NULL DEFAULT 'BORRADOR',
    "metaId" TEXT,
    "metaStatus" TEXT,
    "rejectionReason" TEXT,
    "headerType" "WaHeaderType",
    "headerText" TEXT,
    "headerExample" TEXT,
    "body" TEXT NOT NULL,
    "bodyExamples" JSONB,
    "footer" TEXT,
    "buttons" JSONB,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaTemplate_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "WaCampaign" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WaCampaignStatus" NOT NULL DEFAULT 'BORRADOR',
    "targetFilter" JSONB NOT NULL,
    "variableMap" JSONB NOT NULL DEFAULT '{}',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaCampaign_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "WaCampaignSend" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "WaSendStatus" NOT NULL DEFAULT 'PENDIENTE',
    "errorMsg" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    CONSTRAINT "WaCampaignSend_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "WaTemplate_clinicId_idx" ON "WaTemplate"("clinicId");
-- CreateIndex
CREATE UNIQUE INDEX "WaTemplate_clinicId_name_key" ON "WaTemplate"("clinicId", "name");
-- CreateIndex
CREATE INDEX "WaCampaign_clinicId_idx" ON "WaCampaign"("clinicId");
-- CreateIndex
CREATE INDEX "WaCampaignSend_campaignId_idx" ON "WaCampaignSend"("campaignId");
-- CreateIndex
CREATE INDEX "WaCampaignSend_leadId_idx" ON "WaCampaignSend"("leadId");
-- AddForeignKey
ALTER TABLE "WaTemplate" ADD CONSTRAINT "WaTemplate_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "WaCampaign" ADD CONSTRAINT "WaCampaign_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "WaCampaign" ADD CONSTRAINT "WaCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WaTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "WaCampaignSend" ADD CONSTRAINT "WaCampaignSend_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WaCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "WaCampaignSend" ADD CONSTRAINT "WaCampaignSend_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
