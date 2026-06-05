-- AddIndex: Lead.clinicId + createdAt (pipeline board query)
CREATE INDEX IF NOT EXISTS "Lead_clinicId_createdAt_idx" ON "Lead"("clinicId", "createdAt" DESC);

-- AddIndex: Lead.clinicId + stageId (kanban column grouping)
CREATE INDEX IF NOT EXISTS "Lead_clinicId_stageId_idx" ON "Lead"("clinicId", "stageId");

-- AddIndex: Lead.clinicId + status (status filter queries)
CREATE INDEX IF NOT EXISTS "Lead_clinicId_status_idx" ON "Lead"("clinicId", "status");

-- AddIndex: Message.leadId + channel + sentAt (conversation detail)
CREATE INDEX IF NOT EXISTS "Message_leadId_channel_sentAt_idx" ON "Message"("leadId", "channel", "sentAt");
