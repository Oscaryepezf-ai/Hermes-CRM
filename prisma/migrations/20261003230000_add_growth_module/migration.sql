-- Clínica Growth: rol ANALYST, tipo de pago (para cobros netos) y modelos de inversión publicitaria

-- AlterEnum: nuevo rol para el módulo de inversión publicitaria/reportes
ALTER TYPE "UserRole" ADD VALUE 'ANALYST';

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('PAYMENT', 'REFUND');

-- AlterTable: distinguir pagos de devoluciones para "Cobros Netos"
ALTER TABLE "Payment" ADD COLUMN "type" "PaymentType" NOT NULL DEFAULT 'PAYMENT';

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "channel" "MarketingChannel" NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAdSpend" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "spendAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyAdSpend_pkey" PRIMARY KEY ("id")
);

-- AlterTable: atribución lead → campaña (nullable, no rompe leads existentes)
ALTER TABLE "Lead" ADD COLUMN "campaignId" TEXT;

-- CreateIndex
CREATE INDEX "Campaign_clinicId_isActive_idx" ON "Campaign"("clinicId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAdSpend_campaignId_date_key" ON "DailyAdSpend"("campaignId", "date");

-- CreateIndex
CREATE INDEX "DailyAdSpend_campaignId_date_idx" ON "DailyAdSpend"("campaignId", "date");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAdSpend" ADD CONSTRAINT "DailyAdSpend_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
