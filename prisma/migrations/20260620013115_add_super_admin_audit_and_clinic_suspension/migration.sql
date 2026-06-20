-- CreateEnum
CREATE TYPE "SuperAdminAction" AS ENUM ('CLINIC_CREATED', 'CLINIC_PLAN_CHANGED', 'CLINIC_SUSPENDED', 'CLINIC_REACTIVATED', 'USER_ROLE_CHANGED', 'USER_PASSWORD_RESET', 'USER_ACTIVATED', 'USER_DEACTIVATED');

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT;

-- CreateTable
CREATE TABLE "SuperAdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" "SuperAdminAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetLabel" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperAdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuperAdminAuditLog_adminUserId_createdAt_idx" ON "SuperAdminAuditLog"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SuperAdminAuditLog_targetType_targetId_idx" ON "SuperAdminAuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "SuperAdminAuditLog" ADD CONSTRAINT "SuperAdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

