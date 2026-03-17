import { Readable } from 'node:stream'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
	LEXICAL_SEARCH_ARTIFACT_KEYS,
	type LexicalSearchArtifact,
} from '../../../other/semantic-search/lexical-search-artifact.ts'
import {
	clearLexicalSearchSource,
	ensureLexicalSearchSchema,
	getLexicalSearchSourceState,
	markLexicalSearchSynced,
	replaceLexicalSearchSource,
} from './lexical-search-db'
import { type Env } from './env'

let r2Client:
	| {
			fingerprint: string
			client: S3Client
	  }
	| null = null

function getR2Client(env: Env) {
	const fingerprint = [env.R2_ENDPOINT, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY].join(
		'\0',
	)
	if (r2Client?.fingerprint === fingerprint) return r2Client.client

	const client = new S3Client({
		region: 'auto',
		endpoint: env.R2_ENDPOINT,
		forcePathStyle: true,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		},
	})
	r2Client = { fingerprint, client }
	return client
}

async function streamToString(body: unknown) {
	if (!body) return ''
	if (typeof body === 'string') return body
	if (body instanceof Uint8Array) return Buffer.from(body).toString('utf8')
	if (
		typeof body === 'object' &&
		body !== null &&
		'transformToString' in body &&
		typeof body.transformToString === 'function'
	) {
		return await body.transformToString('utf-8')
	}
	if (body instanceof Readable) {
		const chunks: Array<Buffer> = []
		for await (const chunk of body) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
		}
		return Buffer.concat(chunks).toString('utf8')
	}
	return String(body)
}

async function getLexicalSearchArtifact({
	env,
	key,
}: {
	env: Env
	key: string
}): Promise<LexicalSearchArtifact | null> {
	const client = getR2Client(env)
	try {
		const response = await client.send(
			new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
		)
		const text = await streamToString(response.Body)
		if (!text.trim()) return null
		return JSON.parse(text) as LexicalSearchArtifact
	} catch (error) {
		const name =
			error && typeof error === 'object' && 'name' in error
				? String(error.name)
				: ''
		const message = error instanceof Error ? error.message : String(error)
		if (name === 'NoSuchKey' || /NoSuchKey|not found|404/i.test(message)) {
			return null
		}
		throw error
	}
}

export async function syncLexicalSearchArtifacts({
	env,
	force = false,
}: {
	env: Env
	force?: boolean
}) {
	await ensureLexicalSearchSchema(env.LEXICAL_SEARCH_DB)
	const syncedAt = new Date().toISOString()

	for (const sourceKey of LEXICAL_SEARCH_ARTIFACT_KEYS) {
		const artifact = await getLexicalSearchArtifact({ env, key: sourceKey })
		if (!artifact) {
			await clearLexicalSearchSource({
				db: env.LEXICAL_SEARCH_DB,
				sourceKey,
			})
			continue
		}

		const sourceState = await getLexicalSearchSourceState({
			db: env.LEXICAL_SEARCH_DB,
			sourceKey,
		})
		if (
			!force &&
			sourceState?.generatedAt === artifact.generatedAt &&
			sourceState?.chunkCount === artifact.chunks.length
		) {
			continue
		}

		await replaceLexicalSearchSource({
			db: env.LEXICAL_SEARCH_DB,
			sourceKey,
			artifact,
			syncedAt,
		})
	}

	await markLexicalSearchSynced({
		db: env.LEXICAL_SEARCH_DB,
		syncedAt,
	})

	return { syncedAt }
}
