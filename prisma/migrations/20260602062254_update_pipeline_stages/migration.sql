/*
  Warnings:

  - Added the required column `updatedAt` to the `PipelineStage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "convertedThisMonth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isNewPatientOfMonth" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PipelineStage" ADD COLUMN     "bgColor" TEXT NOT NULL DEFAULT '#EEF3FC',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "headerBgColor" TEXT NOT NULL DEFAULT '#DDE8F8',
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isProtected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "color" SET DEFAULT '#6366F1';

-- CreateIndex
CREATE INDEX "PipelineStage_clinicId_order_idx" ON "PipelineStage"("clinicId", "order");
