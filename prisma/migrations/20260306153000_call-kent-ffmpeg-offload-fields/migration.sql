-- AlterTable
ALTER TABLE "CallKentEpisodeDraft" ADD COLUMN "responseAudioKey" TEXT;
ALTER TABLE "CallKentEpisodeDraft" ADD COLUMN "responseAudioContentType" TEXT;
ALTER TABLE "CallKentEpisodeDraft" ADD COLUMN "responseAudioSize" INTEGER;
ALTER TABLE "CallKentEpisodeDraft" ADD COLUMN "callerSegmentAudioKey" TEXT;
ALTER TABLE "CallKentEpisodeDraft" ADD COLUMN "responseSegmentAudioKey" TEXT;
