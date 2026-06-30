-- DropForeignKey
ALTER TABLE "LeadHistory" DROP CONSTRAINT "LeadHistory_userId_fkey";

-- AlterTable
ALTER TABLE "LeadHistory" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "LeadHistory" ADD CONSTRAINT "LeadHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
