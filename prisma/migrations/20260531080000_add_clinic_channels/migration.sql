CREATE TABLE "ClinicChannel" (
    "id"          TEXT NOT NULL,
    "clinicId"    TEXT NOT NULL,
    "channel"     "MarketingChannel" NOT NULL,
    "isActive"    BOOLEAN NOT NULL DEFAULT false,
    "pageId"      TEXT,
    "accessToken" TEXT,
    "webhookId"   TEXT,
    "connectedAt" TIMESTAMP(3),
    "metadata"    JSONB,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicChannel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicChannel_clinicId_channel_key" ON "ClinicChannel"("clinicId", "channel");
CREATE INDEX "ClinicChannel_clinicId_idx" ON "ClinicChannel"("clinicId");

ALTER TABLE "ClinicChannel" ADD CONSTRAINT "ClinicChannel_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
