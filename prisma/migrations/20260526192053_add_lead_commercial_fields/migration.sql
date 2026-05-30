-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NUEVO', 'CONTACTADO', 'CITA_AGENDADA', 'PRESUPUESTO_ENVIADO', 'CONVERTIDO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "DentalTreatment" AS ENUM ('ORTODONCIA', 'IMPLANTES', 'BLANQUEAMIENTO', 'ENDODONCIA', 'LIMPIEZA', 'CIRUGIA', 'PROTESIS', 'OTRO');

-- CreateEnum
CREATE TYPE "MarketingChannel" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'GOOGLE', 'REFERIDO', 'TIKTOK', 'OTRO');

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_stageId_fkey";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "channel" "MarketingChannel" NOT NULL DEFAULT 'OTRO',
ADD COLUMN     "lastContactAt" TIMESTAMP(3),
ADD COLUMN     "status" "LeadStatus" NOT NULL DEFAULT 'NUEVO',
ADD COLUMN     "treatment" "DentalTreatment" NOT NULL DEFAULT 'OTRO',
ALTER COLUMN "stageId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
