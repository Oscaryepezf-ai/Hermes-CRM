-- CreateEnum
CREATE TYPE "JourneyState" AS ENUM ('PROSPECTO', 'CALIFICADO', 'CITA_AGENDADA', 'EN_CONSULTA', 'PACIENTE_ACTIVO', 'INACTIVO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "BudgetRange" AS ENUM ('BAJO', 'MEDIO', 'ALTO', 'PREMIUM');

-- CreateEnum
CREATE TYPE "LostReason" AS ENUM ('PRECIO_ALTO', 'ELIGIO_OTRA', 'NO_RESPONDE', 'NO_NECESITA', 'MALA_EXPERIENCIA', 'OTRO');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('STATE_CHANGED', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'CALL_MADE', 'QUICK_REPLY_USED', 'APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_COMPLETED', 'NO_SHOW', 'CLINICAL_NOTE_ADDED', 'DICTATION_USED', 'CONVERTED_TO_PATIENT', 'LOST', 'AI_QUALIFIED', 'AI_SCHEDULED', 'AI_REMINDER_SENT', 'AI_REENGAGED');

-- AlterTable Lead — Add journey fields
ALTER TABLE "Lead" ADD COLUMN "journeyState"     "JourneyState" NOT NULL DEFAULT 'PROSPECTO';
ALTER TABLE "Lead" ADD COLUMN "interestLevel"    INTEGER;
ALTER TABLE "Lead" ADD COLUMN "budgetRange"      "BudgetRange";
ALTER TABLE "Lead" ADD COLUMN "consultationDate" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "conversionValue"  DOUBLE PRECISION;
ALTER TABLE "Lead" ADD COLUMN "lostReason"       "LostReason";
ALTER TABLE "Lead" ADD COLUMN "lostAt"           TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "lastActivityAt"   TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "totalTouchpoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Lead" ADD COLUMN "responseTimeAvg"  DOUBLE PRECISION;

-- CreateTable JourneyEvent
CREATE TABLE "JourneyEvent" (
    "id"          TEXT NOT NULL,
    "leadId"      TEXT NOT NULL,
    "userId"      TEXT,
    "type"        "EventType" NOT NULL,
    "fromState"   "JourneyState",
    "toState"     "JourneyState",
    "metadata"    JSONB,
    "note"        TEXT,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JourneyEvent_leadId_idx" ON "JourneyEvent"("leadId");

-- AddForeignKey
ALTER TABLE "JourneyEvent" ADD CONSTRAINT "JourneyEvent_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JourneyEvent" ADD CONSTRAINT "JourneyEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
