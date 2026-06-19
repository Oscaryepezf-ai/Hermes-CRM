
-- CreateEnum
CREATE TYPE "MissionKey" AS ENUM ('CUENTA_CREADA', 'CREAR_CITA', 'REGISTRAR_EVOLUCION');

-- CreateEnum
CREATE TYPE "PracticeType" AS ENUM ('ODONTOLOGIA', 'ORTODONCIA_ESPECIALIZADA', 'RED_DENTAL', 'OTRO');

-- CreateEnum
CREATE TYPE "CurrentTools" AS ENUM ('PAPEL', 'HERRAMIENTAS_SUELTAS', 'SOFTWARE_ESPECIALIZADO');

-- CreateEnum
CREATE TYPE "SelfReportedRole" AS ENUM ('DUENO_CONSULTORIO', 'ADMINISTRADOR', 'RECEPCIONISTA', 'PROFESIONAL_MULTISEDE', 'ESTUDIANTE', 'OTRO');

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "currentTools" "CurrentTools",
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "practiceType" "PracticeType",
ADD COLUMN     "rewardClaimed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rewardClaimedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selfReportedRole" "SelfReportedRole";

-- CreateTable
CREATE TABLE "PhoneVerification" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationMission" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "missionKey" "MissionKey" NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationMission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhoneVerification_phone_idx" ON "PhoneVerification"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationMission_clinicId_missionKey_key" ON "ActivationMission"("clinicId", "missionKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- AddForeignKey
ALTER TABLE "ActivationMission" ADD CONSTRAINT "ActivationMission_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

