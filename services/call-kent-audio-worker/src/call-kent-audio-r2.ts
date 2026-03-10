import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { type Env } from './env'

const signedUrlExpiresInSeconds = 15 * 60

const episodeDraftAudioFileNameByKind = {
	episode: 'episode.mp3',
	callerSegment: 'caller-segment.mp3',
	responseSegment: 'response-segment.mp3',
} as const

function createR2Client(env: Pick<
	Env,
	'R2_ENDPOINT' | 'R2_ACCESS_KEY_ID' | 'R2_SECRET_ACCESS_KEY'
>) {
	return new S3Client({
		region: 'auto',
		endpoint: env.R2_ENDPOINT,
		forcePathStyle: true,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		},
	})
}

function getEpisodeDraftAudioKey({
	draftId,
	kind,
}: {
	draftId: string
	kind: keyof typeof episodeDraftAudioFileNameByKind
}) {
	return `call-kent/drafts/${draftId}/${episodeDraftAudioFileNameByKind[kind]}`
}

export type CallKentAudioSignedUrls = {
	callAudioUrl: string
	responseAudioUrl: string
	episodeAudioKey: string
	episodeUploadUrl: string
	callerSegmentAudioKey: string
	callerSegmentUploadUrl: string
	responseSegmentAudioKey: string
	responseSegmentUploadUrl: string
}

export async function createSignedEpisodeAudioUrls({
	env,
	draftId,
	callAudioKey,
	responseAudioKey,
}: {
	env: Pick<
		Env,
		| 'R2_ENDPOINT'
		| 'R2_ACCESS_KEY_ID'
		| 'R2_SECRET_ACCESS_KEY'
		| 'CALL_KENT_R2_BUCKET'
	>
	draftId: string
	callAudioKey: string
	responseAudioKey: string
}): Promise<CallKentAudioSignedUrls> {
	const s3 = createR2Client(env)
	const episodeAudioKey = getEpisodeDraftAudioKey({ draftId, kind: 'episode' })
	const callerSegmentAudioKey = getEpisodeDraftAudioKey({
		draftId,
		kind: 'callerSegment',
	})
	const responseSegmentAudioKey = getEpisodeDraftAudioKey({
		draftId,
		kind: 'responseSegment',
	})
	const [callAudioUrl, responseAudioUrl, episodeUploadUrl, callerSegmentUploadUrl, responseSegmentUploadUrl] =
		await Promise.all([
			getSignedUrl(
				s3,
				new GetObjectCommand({
					Bucket: env.CALL_KENT_R2_BUCKET,
					Key: callAudioKey,
				}),
				{ expiresIn: signedUrlExpiresInSeconds },
			),
			getSignedUrl(
				s3,
				new GetObjectCommand({
					Bucket: env.CALL_KENT_R2_BUCKET,
					Key: responseAudioKey,
				}),
				{ expiresIn: signedUrlExpiresInSeconds },
			),
			getSignedUrl(
				s3,
				new PutObjectCommand({
					Bucket: env.CALL_KENT_R2_BUCKET,
					Key: episodeAudioKey,
					ContentType: 'audio/mpeg',
				}),
				{ expiresIn: signedUrlExpiresInSeconds },
			),
			getSignedUrl(
				s3,
				new PutObjectCommand({
					Bucket: env.CALL_KENT_R2_BUCKET,
					Key: callerSegmentAudioKey,
					ContentType: 'audio/mpeg',
				}),
				{ expiresIn: signedUrlExpiresInSeconds },
			),
			getSignedUrl(
				s3,
				new PutObjectCommand({
					Bucket: env.CALL_KENT_R2_BUCKET,
					Key: responseSegmentAudioKey,
					ContentType: 'audio/mpeg',
				}),
				{ expiresIn: signedUrlExpiresInSeconds },
			),
		])
	return {
		callAudioUrl,
		responseAudioUrl,
		episodeAudioKey,
		episodeUploadUrl,
		callerSegmentAudioKey,
		callerSegmentUploadUrl,
		responseSegmentAudioKey,
		responseSegmentUploadUrl,
	}
}
