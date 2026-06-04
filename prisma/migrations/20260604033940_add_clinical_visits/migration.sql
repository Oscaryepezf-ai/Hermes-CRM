-- CreateTable
CREATE TABLE "ClinicalVisit" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "procedures" TEXT,
    "findings" TEXT,
    "medications" TEXT,
    "instructions" TEXT,
    "followUp" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalVisit_leadId_visitDate_idx" ON "ClinicalVisit"("leadId", "visitDate");

-- CreateIndex
CREATE INDEX "ClinicalVisit_clinicId_visitDate_idx" ON "ClinicalVisit"("clinicId", "visitDate");

-- AddForeignKey
ALTER TABLE "ClinicalVisit" ADD CONSTRAINT "ClinicalVisit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalVisit" ADD CONSTRAINT "ClinicalVisit_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalVisit" ADD CONSTRAINT "ClinicalVisit_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
