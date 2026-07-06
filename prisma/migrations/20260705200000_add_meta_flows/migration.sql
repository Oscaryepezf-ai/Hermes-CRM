
-- CreateEnum
CREATE TYPE "MetaFlowCategory" AS ENUM ('LEAD_QUALIFICATION', 'APPOINTMENT_REQUEST', 'POST_VISIT_SURVEY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MetaFlowStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED', 'BLOCKED');

-- CreateTable
CREATE TABLE "MetaFlow" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "MetaFlowCategory" NOT NULL,
    "status" "MetaFlowStatus" NOT NULL DEFAULT 'DRAFT',
    "metaFlowId" TEXT,
    "metaStatus" TEXT,
    "screens" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaFlowSubmission" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "leadId" TEXT,
    "data" JSONB NOT NULL,
    "flowToken" TEXT,
    "waMessageId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaFlowSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaFlow_clinicId_idx" ON "MetaFlow"("clinicId");

-- CreateIndex
CREATE INDEX "MetaFlowSubmission_flowId_idx" ON "MetaFlowSubmission"("flowId");

-- CreateIndex
CREATE INDEX "MetaFlowSubmission_clinicId_idx" ON "MetaFlowSubmission"("clinicId");

-- CreateIndex
CREATE INDEX "MetaFlowSubmission_leadId_idx" ON "MetaFlowSubmission"("leadId");

-- AddForeignKey
ALTER TABLE "MetaFlow" ADD CONSTRAINT "MetaFlow_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaFlowSubmission" ADD CONSTRAINT "MetaFlowSubmission_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "MetaFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaFlowSubmission" ADD CONSTRAINT "MetaFlowSubmission_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

