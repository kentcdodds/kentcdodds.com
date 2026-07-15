ALTER TABLE "Call" ADD COLUMN "callerTranscriptJobId" TEXT;
ALTER TABLE "Call" ADD COLUMN "callerTranscriptLeaseId" TEXT;
ALTER TABLE "Call" ADD COLUMN "callerTranscriptLeaseExpiresAt" DATETIME;

ALTER TABLE "CallKentEpisodeDraft" ADD COLUMN "processingJobId" TEXT;
ALTER TABLE "CallKentEpisodeDraft" ADD COLUMN "processingLeaseId" TEXT;
ALTER TABLE "CallKentEpisodeDraft" ADD COLUMN "processingLeaseExpiresAt" DATETIME;

CREATE INDEX IF NOT EXISTS "Call_callerTranscriptStatus_updatedAt_idx"
ON "Call"("callerTranscriptStatus", "updatedAt");

CREATE INDEX IF NOT EXISTS "CallKentEpisodeDraft_status_updatedAt_idx"
ON "CallKentEpisodeDraft"("status", "updatedAt");
