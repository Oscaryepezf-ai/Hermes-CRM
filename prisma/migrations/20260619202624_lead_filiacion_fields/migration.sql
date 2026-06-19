-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CEDULA', 'PASAPORTE', 'RUC', 'OTRO');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('HOMBRE', 'MUJER');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "additionalInfo" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "birthCountry" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "businessLine" TEXT,
ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "documentType" "DocumentType" DEFAULT 'CEDULA',
ADD COLUMN     "hcNumber" TEXT,
ADD COLUMN     "insurer" TEXT,
ADD COLUMN     "landline" TEXT,
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "patientGroup" TEXT,
ADD COLUMN     "sex" "Sex";
