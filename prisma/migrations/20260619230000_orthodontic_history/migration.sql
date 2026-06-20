-- CreateTable
CREATE TABLE "OrthodonticHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "chiefComplaint" TEXT,
    "priorOrthoTreatment" TEXT,
    "facialType" TEXT,
    "facialSymmetry" TEXT,
    "profileType" TEXT,
    "lipCompetence" TEXT,
    "nasolabialAngle" TEXT,
    "facialNotes" TEXT,
    "breathingType" TEXT,
    "swallowingType" TEXT,
    "habits" TEXT[],
    "tmjFindings" TEXT,
    "functionalNotes" TEXT,
    "angleClassRight" TEXT,
    "angleClassLeft" TEXT,
    "molarRelationRight" TEXT,
    "molarRelationLeft" TEXT,
    "canineRelationRight" TEXT,
    "canineRelationLeft" TEXT,
    "overjetMm" DOUBLE PRECISION,
    "overbiteMm" DOUBLE PRECISION,
    "upperMidlineDeviation" TEXT,
    "lowerMidlineDeviation" TEXT,
    "crowdingUpperMm" DOUBLE PRECISION,
    "crowdingLowerMm" DOUBLE PRECISION,
    "spacingUpperMm" DOUBLE PRECISION,
    "spacingLowerMm" DOUBLE PRECISION,
    "crossbite" TEXT[],
    "openBite" BOOLEAN DEFAULT false,
    "curveOfSpee" TEXT,
    "missingTeeth" TEXT,
    "impactedTeeth" TEXT,
    "occlusalNotes" TEXT,
    "snaAngle" DOUBLE PRECISION,
    "snbAngle" DOUBLE PRECISION,
    "anbAngle" DOUBLE PRECISION,
    "fmaAngle" DOUBLE PRECISION,
    "skeletalClass" TEXT,
    "cephalometricNotes" TEXT,
    "skeletalDiagnosis" TEXT,
    "dentalDiagnosis" TEXT,
    "functionalDiagnosis" TEXT,
    "treatmentPhase" TEXT,
    "applianceType" TEXT,
    "extractionsPlanned" TEXT,
    "treatmentObjectives" TEXT,
    "estimatedDurationMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrthodonticHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrthodonticVisit" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upperArchwire" TEXT,
    "lowerArchwire" TEXT,
    "elastics" TEXT,
    "proceduresDone" TEXT,
    "oralHygiene" TEXT,
    "observations" TEXT,
    "nextAppointment" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrthodonticVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrthodonticHistory_leadId_key" ON "OrthodonticHistory"("leadId");

-- CreateIndex
CREATE INDEX "OrthodonticVisit_leadId_visitDate_idx" ON "OrthodonticVisit"("leadId", "visitDate");

-- CreateIndex
CREATE INDEX "OrthodonticVisit_clinicId_visitDate_idx" ON "OrthodonticVisit"("clinicId", "visitDate");

-- AddForeignKey
ALTER TABLE "OrthodonticHistory" ADD CONSTRAINT "OrthodonticHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthodonticVisit" ADD CONSTRAINT "OrthodonticVisit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthodonticVisit" ADD CONSTRAINT "OrthodonticVisit_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrthodonticVisit" ADD CONSTRAINT "OrthodonticVisit_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

