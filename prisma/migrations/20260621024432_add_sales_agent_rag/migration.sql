-- CreateEnum
CREATE TYPE "SalesStage" AS ENUM ('CONEXION', 'INDAGACION', 'CONSTRUCCION_VALOR', 'MANEJO_OBJECIONES', 'CIERRE_SUAVE', 'LISTO_PARA_HUMANO');

-- CreateEnum
CREATE TYPE "KnowledgeSourceType" AS ENUM ('TEXTO_MANUAL', 'FAQ', 'TESTIMONIOS', 'GUION_OBJECIONES');

-- AlterTable
ALTER TABLE "AgentConversation" ADD COLUMN     "decisionTimeline" TEXT,
ADD COLUMN     "detectedNeeds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "emotionalState" TEXT,
ADD COLUMN     "objections" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "preferredTone" TEXT,
ADD COLUMN     "rapportScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "resourcesSent" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "salesStage" "SalesStage" NOT NULL DEFAULT 'CONEXION';

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" "KnowledgeSourceType" NOT NULL,
    "rawContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "chunkIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeDocument_clinicId_idx" ON "KnowledgeDocument"("clinicId");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_clinicId_idx" ON "KnowledgeChunk"("clinicId");

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

