-- AlterTable Clinic — add Meta channel fields
ALTER TABLE "Clinic" ADD COLUMN "facebookPageId"  TEXT;
ALTER TABLE "Clinic" ADD COLUMN "messengerActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Clinic" ADD COLUMN "instagramActive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Message — add channel + dedup ID
ALTER TABLE "Message" ADD COLUMN "channel"           "MarketingChannel" NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE "Message" ADD COLUMN "externalMessageId" TEXT;

CREATE INDEX "Message_externalMessageId_idx" ON "Message"("externalMessageId");

-- CreateTable SocialProfile
CREATE TABLE "SocialProfile" (
    "id"            TEXT NOT NULL,
    "leadId"        TEXT NOT NULL,
    "channel"       "MarketingChannel" NOT NULL,
    "externalId"    TEXT NOT NULL,
    "displayName"   TEXT,
    "profilePicUrl" TEXT,
    "locale"        TEXT,
    "timezone"      INTEGER,
    "rawProfile"    JSONB,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialProfile_channel_externalId_key" ON "SocialProfile"("channel", "externalId");
CREATE INDEX "SocialProfile_externalId_idx" ON "SocialProfile"("externalId");

ALTER TABLE "SocialProfile" ADD CONSTRAINT "SocialProfile_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
