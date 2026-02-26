import { z } from 'zod'

const nonEmptyString = z.string().trim().min(1)

const schemaBase = z.object({
	NODE_ENV: z.enum(['production', 'development', 'test'] as const),
	PORT: nonEmptyString,
	MOCKS: z.enum(['true', 'false']).optional(),
	PLAYWRIGHT_TEST_BASE_URL: z.string().trim().optional(),
	STARTUP_SHORTCUTS: z.enum(['true', 'false']).optional(),
	EXPIRED_SESSIONS_CLEANUP_DISABLED: z.enum(['true', 'false']).optional(),

	ALLOWED_ACTION_ORIGINS: z.string().trim().optional(),

	// Optional because it can be derived from `DATABASE_URL` when using SQLite
	// `file:` URLs.
	DATABASE_PATH: z.string().trim().optional(),
	DATABASE_URL: nonEmptyString,
	CACHE_DATABASE_PATH: nonEmptyString,
	MEDIA_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://media.kcd.dev'),
	MEDIA_STREAM_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://media.kcd.dev/stream'),

	BOT_GITHUB_TOKEN: nonEmptyString,
	CALL_KENT_PODCAST_ID: nonEmptyString,
	CHATS_WITH_KENT_PODCAST_ID: nonEmptyString,
	KIT_API_KEY: nonEmptyString,
	KIT_API_SECRET: nonEmptyString,
	KIT_API_BASE_URL: z.string().trim().optional().default('https://api.kit.com'),
	DISCORD_ADMIN_USER_ID: nonEmptyString,
	DISCORD_BLUE_CHANNEL: nonEmptyString,
	DISCORD_BLUE_ROLE: nonEmptyString,
	DISCORD_BOT_TOKEN: nonEmptyString,
	DISCORD_CALL_KENT_CHANNEL: nonEmptyString,
	DISCORD_CLIENT_ID: nonEmptyString,
	DISCORD_CLIENT_SECRET: nonEmptyString,
	DISCORD_API_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://discord.com/api'),
	DISCORD_GUILD_ID: nonEmptyString,
	DISCORD_LEADERBOARD_CHANNEL: nonEmptyString,
	DISCORD_MEMBER_ROLE: nonEmptyString,
	DISCORD_PRIVATE_BOT_CHANNEL: nonEmptyString,
	DISCORD_RED_CHANNEL: nonEmptyString,
	DISCORD_RED_ROLE: nonEmptyString,
	DISCORD_SCOPES: nonEmptyString,
	DISCORD_YELLOW_CHANNEL: nonEmptyString,
	DISCORD_YELLOW_ROLE: nonEmptyString,
	OAUTH_PROVIDER_BASE_URL: z
		.string()
		.trim()
		.optional(),
	OEMBED_API_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://oembed.com'),
	MERMAID_TO_SVG_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://mermaid-to-svg.kentcdodds.workers.dev'),
	PWNED_PASSWORDS_API_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://api.pwnedpasswords.com'),
	INTERNAL_COMMAND_TOKEN: nonEmptyString,
	MAILGUN_DOMAIN: nonEmptyString,
	MAILGUN_SENDING_KEY: nonEmptyString,
	MAILGUN_API_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://api.mailgun.net'),
	GRAVATAR_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://www.gravatar.com'),
	SENTRY_AUTH_TOKEN: z.string().trim().optional(),
	// Sentry is optional; validate required combos in `superRefine`.
	SENTRY_DSN: z.string().trim().optional(),
	SENTRY_ORG: z.string().trim().optional(),
	SENTRY_PROJECT: z.string().trim().optional(),
	SENTRY_PROJECT_ID: z.string().trim().optional(),
	SESSION_SECRET: nonEmptyString,
	SIMPLECAST_KEY: nonEmptyString,
	SIMPLECAST_API_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://api.simplecast.com'),
	TRANSISTOR_API_SECRET: nonEmptyString,
	TRANSISTOR_API_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://api.transistor.fm'),
	TWITTER_SYNDICATION_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://cdn.syndication.twimg.com'),
	TWITTER_SHORTENER_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://t.co'),
	TWITTER_OEMBED_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://publish.twitter.com'),
	TWITTER_BEARER_TOKEN: nonEmptyString,
	VERIFIER_API_KEY: nonEmptyString,
	VERIFIER_API_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://verifyright.co'),

	// Semantic search + AI features via Cloudflare Workers AI + Vectorize (+ AI Gateway).
	CLOUDFLARE_ACCOUNT_ID: nonEmptyString,
	CLOUDFLARE_API_TOKEN: nonEmptyString,
	CLOUDFLARE_API_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://api.cloudflare.com/client/v4'),
	CLOUDFLARE_AI_GATEWAY_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://gateway.ai.cloudflare.com/v1'),
	/** AI Gateway "id" is the gateway name you create in Cloudflare. */
	CLOUDFLARE_AI_GATEWAY_ID: nonEmptyString,
	/**
	 * Optional embedding AI Gateway id.
	 * Used by semantic-search embeddings (runtime queries + indexing jobs).
	 * Falls back to `CLOUDFLARE_AI_GATEWAY_ID` when omitted.
	 */
	CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: z.string().trim().optional(),
	/**
	 * AI Gateway authenticated gateway token (used as `cf-aig-authorization`).
	 */
	CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN: nonEmptyString,
	CLOUDFLARE_VECTORIZE_INDEX: nonEmptyString,
	CLOUDFLARE_AI_EMBEDDING_MODEL: z
		.string()
		.trim()
		.optional()
		.default('@cf/google/embeddinggemma-300m'),
	CLOUDFLARE_AI_TRANSCRIPTION_MODEL: z
		.string()
		.trim()
		.optional()
		.default('@cf/openai/whisper'),
	CLOUDFLARE_AI_TRANSCRIPTION_ALLOW_BASE64: z
		.enum(['true', 'false'])
		.optional()
		.default('false'),
	CLOUDFLARE_AI_TEXT_TO_SPEECH_MODEL: z
		.string()
		.trim()
		.optional()
		.default('@cf/deepgram/aura-2-en'),
	CLOUDFLARE_AI_TEXT_MODEL: z
		.string()
		.trim()
		.optional()
		.default('@cf/meta/llama-3.1-8b-instruct'),
	CLOUDFLARE_AI_CALL_KENT_METADATA_MODEL: z.string().trim().optional(),
	CLOUDFLARE_AI_CALL_KENT_TRANSCRIPT_FORMAT_MODEL: z.string().trim().optional(),

	// Semantic search admin tooling (R2 manifests + ignore list).
	R2_BUCKET: nonEmptyString,
	// Optional: derived from CLOUDFLARE_ACCOUNT_ID when omitted.
	R2_ENDPOINT: z.string().trim().optional(),
	R2_ACCESS_KEY_ID: nonEmptyString,
	R2_SECRET_ACCESS_KEY: nonEmptyString,
	// Call Kent audio storage bucket (used by R2-backed call audio storage and
	// the disk-backed mock when MOCKS=true).
	CALL_KENT_R2_BUCKET: nonEmptyString,
	SEMANTIC_SEARCH_IGNORE_LIST_KEY: z
		.string()
		.trim()
		.optional()
		.default('manifests/ignore-list.json'),

	GITHUB_REF: z.string().trim().optional().default('main'),
	GITHUB_API_BASE_URL: z
		.string()
		.trim()
		.optional()
		.default('https://api.github.com'),

	// Optional: /youtube route + indexing scripts.
	YOUTUBE_PLAYLIST_ID: z
		.string()
		.trim()
		.default('PLV5CVI1eNcJgNqzNwcs4UKrlJdhfDjshf'),
})

const schema = schemaBase.superRefine((values, ctx) => {
	if (values.SENTRY_DSN && !values.SENTRY_PROJECT_ID) {
		ctx.addIssue({
			code: 'custom',
			message: 'SENTRY_PROJECT_ID is required when SENTRY_DSN is set',
			path: ['SENTRY_PROJECT_ID'],
		})
	}

	// If we weren't explicitly given a DATABASE_PATH, require a `file:` URL so we
	// can derive one deterministically.
	if (!values.DATABASE_PATH && !values.DATABASE_URL.startsWith('file:')) {
		ctx.addIssue({
			code: 'custom',
			message:
				'DATABASE_PATH is required when DATABASE_URL is not a SQLite file: URL',
			path: ['DATABASE_PATH'],
		})
	}

	const port = Number(values.PORT)
	if (!Number.isFinite(port) || port <= 0) {
		ctx.addIssue({
			code: 'custom',
			message: 'PORT must be a positive number',
			path: ['PORT'],
		})
	}
})

type BaseEnv = z.infer<typeof schemaBase>
type BaseEnvInput = z.input<typeof schemaBase>
type EnvInput = Record<keyof BaseEnvInput, string | undefined>

export type Env = Omit<
	BaseEnv,
	| 'PORT'
	| 'MOCKS'
	| 'DATABASE_PATH'
	| 'CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID'
	| 'CLOUDFLARE_AI_TRANSCRIPTION_ALLOW_BASE64'
> & {
	PORT: number
	MOCKS: boolean
	DATABASE_PATH: string
	allowedActionOrigins: string[]
	/**
	 * Defaults to `CLOUDFLARE_AI_TEXT_MODEL` when not explicitly set.
	 * This keeps Call Kent metadata generation aligned with the site's configured
	 * text model by default.
	 */
	CLOUDFLARE_AI_CALL_KENT_METADATA_MODEL: string
	/**
	 * Defaults to `CLOUDFLARE_AI_TEXT_MODEL` when not explicitly set.
	 * Used to format generated Call Kent transcripts into readable paragraphs.
	 */
	CLOUDFLARE_AI_CALL_KENT_TRANSCRIPT_FORMAT_MODEL: string
	/**
	 * Embedding calls can be routed through a separate gateway (for example, with
	 * guardrails disabled). This is used by semantic-search embeddings for both
	 * runtime user queries and indexing jobs.
	 */
	CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID: string
	/** Derived from CLOUDFLARE_ACCOUNT_ID when not explicitly set. */
	R2_ENDPOINT: string
	CLOUDFLARE_AI_TRANSCRIPTION_ALLOW_BASE64: boolean
}

declare global {
	namespace NodeJS {
		interface ProcessEnv extends BaseEnvInput {}
	}
}

function computeAllowedActionOrigins(values: BaseEnv) {
	const configuredOrigins =
		values.ALLOWED_ACTION_ORIGINS?.split(',')
			.map((origin) => origin.trim())
			.filter(Boolean) ?? []

	if (configuredOrigins.length > 0) return configuredOrigins
	if (values.NODE_ENV !== 'production') return ['**']

	return ['kentcdodds.com', '*.kentcdodds.com']
}

function deriveDatabasePath(values: BaseEnv) {
	if (values.DATABASE_PATH) return values.DATABASE_PATH
	// superRefine ensures this is a `file:` URL at this point.
	return values.DATABASE_URL.slice('file:'.length)
}

let _cache:
	| {
			fingerprint: string
			env: Env
	  }
	| undefined
let _runtimeEnvSource: Partial<EnvInput> | undefined

export function setRuntimeEnvSource(envSource: Partial<EnvInput>) {
	_runtimeEnvSource = envSource
	_cache = undefined
}

export function clearRuntimeEnvSource() {
	_runtimeEnvSource = undefined
	_cache = undefined
}

export function getEnv(): Env {
	const keys = Object.keys(schemaBase.shape) as Array<keyof BaseEnv>
	const envSource = getEnvSource()
	const fingerprint = keys
		.map((k) => `${String(k)}=${envSource[String(k)] ?? ''}`)
		.join('\0')

	if (_cache?.fingerprint === fingerprint) return _cache.env

	const parsed = schema.safeParse(envSource)

	if (parsed.success === false) {
		// Prefer throwing the ZodError; `init()` prints a nicer message.
		throw parsed.error
	}

	const values = parsed.data
	const derivedR2Endpoint =
		typeof values.R2_ENDPOINT === 'string' && values.R2_ENDPOINT.trim()
			? values.R2_ENDPOINT.trim()
			: `https://${values.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
	const env: Env = {
		...values,
		PORT: Number(values.PORT),
		MOCKS: values.MOCKS === 'true',
		DATABASE_PATH: deriveDatabasePath(values),
		allowedActionOrigins: computeAllowedActionOrigins(values),
		R2_ENDPOINT: derivedR2Endpoint,
		CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID:
			values.CLOUDFLARE_AI_EMBEDDING_GATEWAY_ID ||
			values.CLOUDFLARE_AI_GATEWAY_ID,
		CLOUDFLARE_AI_CALL_KENT_METADATA_MODEL:
			values.CLOUDFLARE_AI_CALL_KENT_METADATA_MODEL ??
			values.CLOUDFLARE_AI_TEXT_MODEL,
		CLOUDFLARE_AI_CALL_KENT_TRANSCRIPT_FORMAT_MODEL:
			values.CLOUDFLARE_AI_CALL_KENT_TRANSCRIPT_FORMAT_MODEL ??
			values.CLOUDFLARE_AI_TEXT_MODEL,
		CLOUDFLARE_AI_TRANSCRIPTION_ALLOW_BASE64:
			values.CLOUDFLARE_AI_TRANSCRIPTION_ALLOW_BASE64 === 'true',
	}

	_cache = { fingerprint, env }
	return env
}

export function init() {
	let parsedEnv: Env
	try {
		parsedEnv = getEnv()
	} catch (error: unknown) {
		if (error instanceof z.ZodError) {
			console.error(
				'❌ Invalid environment variables:',
				z.flattenError(error).fieldErrors,
			)
			throw new Error('Invalid environment variables')
		}

		// Preserve non-Zod failures from `getEnv()` so callers see the real cause.
		if (error instanceof Error) {
			console.error(
				'❌ Unexpected error while validating environment:',
				error.message,
			)
			if (error.stack) console.error(error.stack)
			throw error
		}

		console.error('❌ Unexpected error while validating environment:', error)
		throw new Error(
			`Unexpected error while validating environment: ${String(error)}`,
		)
	}
	// Keep unused warning quiet (and make debugging easier if needed).
	void parsedEnv
}

/**
 * This is used in both `entry.server.ts` and `root.tsx` to ensure that
 * the environment variables are set and globally available before the app is
 * started.
 *
 * NOTE: Do *not* add any environment variables in here that you do not wish to
 * be included in the client.
 * @returns all public ENV variables
 */
export function getPublicEnv() {
	const env = getEnv()
	return {
		MODE: env.NODE_ENV,
		DISCORD_CLIENT_ID: env.DISCORD_CLIENT_ID,
		SENTRY_DSN: env.SENTRY_DSN,
		MEDIA_BASE_URL: env.MEDIA_BASE_URL,
		MEDIA_STREAM_BASE_URL: env.MEDIA_STREAM_BASE_URL,
	}
}

type PublicEnv = ReturnType<typeof getPublicEnv>

function getEnvSource(): Record<string, string | undefined> {
	if (!_runtimeEnvSource) return process.env
	return {
		...process.env,
		..._runtimeEnvSource,
	}
}

declare global {
	var ENV: PublicEnv
	interface Window {
		ENV: PublicEnv
	}
}
