-- Rename UserRole enum values (preserves existing data)
ALTER TYPE "UserRole" RENAME VALUE 'OWNER' TO 'ADMIN';
ALTER TYPE "UserRole" RENAME VALUE 'DENTIST' TO 'DOCTOR';
ALTER TYPE "UserRole" RENAME VALUE 'STAFF' TO 'RECEPTIONIST';

-- Change default value for User.role
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'RECEPTIONIST'::"UserRole";

-- Add new fields to User model
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "invitedByUserId" TEXT;
ALTER TABLE "User" ADD COLUMN "invitedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- Create UserInvitation table
CREATE TABLE "UserInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "clinicId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "UserInvitation_token_key" ON "UserInvitation"("token");
CREATE INDEX "UserInvitation_token_idx" ON "UserInvitation"("token");
CREATE INDEX "UserInvitation_email_clinicId_idx" ON "UserInvitation"("email", "clinicId");

-- Add foreign keys
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
