CREATE TABLE "AiUsageLog" (
    "id"            TEXT NOT NULL,
    "clinicId"      TEXT NOT NULL,
    "agentKey"      TEXT NOT NULL,
    "model"         TEXT NOT NULL,
    "tokensInput"   INTEGER NOT NULL DEFAULT 0,
    "tokensOutput"  INTEGER NOT NULL DEFAULT 0,
    "audioDuration" DOUBLE PRECISION,
    "costUsd"       DOUBLE PRECISION NOT NULL,
    "latencyMs"     INTEGER NOT NULL,
    "success"       BOOLEAN NOT NULL,
    "errorCode"     TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiUsageLog_clinicId_createdAt_idx" ON "AiUsageLog"("clinicId", "createdAt");
CREATE INDEX "AiUsageLog_agentKey_createdAt_idx" ON "AiUsageLog"("agentKey", "createdAt");

ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
