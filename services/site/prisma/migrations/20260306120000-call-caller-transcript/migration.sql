-- AlterTable
ALTER TABLE "Call" ADD COLUMN "callerTranscript" TEXT;
ALTER TABLE "Call" ADD COLUMN "callerTranscriptStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "Call" ADD COLUMN "callerTranscriptErrorMessage" TEXT;
