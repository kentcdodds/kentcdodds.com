import { z } from 'zod'

const nonEmptyString = z.string().trim().min(1)

const schemaBase = z.object({
		NODE_ENV: z
		.enum(['production', 'development', 'test'] as const),
		PORT: nonEmptyString,
		MOCKS: z.enum(['true', 'false']).optional(),
		PLAYWRIGHT_TEST_BASE_URL: z.string().trim().optional(),
		STARTUP_SHORTCUTS: z.enum(['true', 'false']).optional(),
		EXPIRED_SESSIONS_CLEANUP_DISABLED: z.enum(['true', 'false']).optional(),

		ALLOWED_ACTION_ORIGINS: z.string().trim().optional(),

		FLY_APP_NAME: nonEmptyString,
		FLY_REGION: nonEmptyString,
		FLY_INSTANCE: nonEmptyString,
		LITEFS_DIR: nonEmptyString,

		// Used by LiteFS + tooling. Optional because it can be derived from
		// `DATABASE_URL` when using SQLite `file:` URLs.
		DATABASE_PATH: z.string().trim().optional(),
		DATABASE_URL: nonEmptyString,
		CACHE_DATABASE_PATH: nonEmptyString,

		BOT_GITHUB_TOKEN: nonEmptyString,
		CALL_KENT_PODCAST_ID: nonEmptyString,
		CHATS_WITH_KENT_PODCAST_ID: nonEmptyString,
		KIT_API_KEY: nonEmptyString,
		KIT_API_SECRET: nonEmptyString,
		DISCORD_ADMIN_USER_ID: nonEmptyString,
		DISCORD_BLUE_CHANNEL: nonEmptyString,
		DISCORD_BLUE_ROLE: nonEmptyString,
		DISCORD_BOT_TOKEN: nonEmptyString,
		DISCORD_CALL_KENT_CHANNEL: nonEmptyString,
		DISCORD_CLIENT_ID: nonEmptyString,
		DISCORD_CLIENT_SECRET: nonEmptyString,
		DISCORD_GUILD_ID: nonEmptyString,
		DISCORD_LEADERBOARD_CHANNEL: nonEmptyString,
		DISCORD_MEMBER_ROLE: nonEmptyString,
		DISCORD_PRIVATE_BOT_CHANNEL: nonEmptyString,
		DISCORD_RED_CHANNEL: nonEmptyString,
		DISCORD_RED_ROLE: nonEmptyString,
		DISCORD_SCOPES: nonEmptyString,
		DISCORD_YELLOW_CHANNEL: nonEmptyString,
		DISCORD_YELLOW_ROLE: nonEmptyString,
		INTERNAL_COMMAND_TOKEN: nonEmptyString,
		MAGIC_LINK_SECRET: nonEmptyString,
		MAILGUN_DOMAIN: nonEmptyString,
		MAILGUN_SENDING_KEY: nonEmptyString,
		REFRESH_CACHE_SECRET: nonEmptyString,
		SENTRY_AUTH_TOKEN: z.string().trim().optional(),
		// Sentry is optional; validate required combos in `superRefine`.
		SENTRY_DSN: z.string().trim().optional(),
		SENTRY_ORG: z.string().trim().optional(),
		SENTRY_PROJECT: z.string().trim().optional(),
		SENTRY_PROJECT_ID: z.string().trim().optional(),
		SESSION_SECRET: nonEmptyString,
		SIMPLECAST_KEY: nonEmptyString,
		TRANSISTOR_API_SECRET: nonEmptyString,
		TWITTER_BEARER_TOKEN: nonEmptyString,
		VERIFIER_API_KEY: nonEmptyString,
		CF_INTERNAL_SECRET: nonEmptyString,

		// Optional: semantic search via Cloudflare Workers AI + Vectorize.
		CLOUDFLARE_ACCOUNT_ID: z.string().trim().optional(),
		CLOUDFLARE_API_TOKEN: z.string().trim().optional(),
		CLOUDFLARE_VECTORIZE_INDEX: z.string().trim().optional(),
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
		CLOUDFLARE_AI_TEXT_TO_SPEECH_MODEL: z
			.string()
			.trim()
			.optional()
			.default('@cf/deepgram/aura-1'),

		// Optional: semantic search admin tooling (R2 manifests + ignore list).
		R2_BUCKET: z.string().trim().optional().default('kcd-semantic-search'),
		R2_ENDPOINT: z.string().trim().optional(),
		R2_ACCESS_KEY_ID: z.string().trim().optional(),
		R2_SECRET_ACCESS_KEY: z.string().trim().optional(),
		SEMANTIC_SEARCH_IGNORE_LIST_KEY: z
			.string()
			.trim()
			.optional()
			.default('manifests/ignore-list.json'),

		GITHUB_REF: z.string().trim().optional().default('main'),

		// Optional: /youtube route + indexing scripts.
		YOUTUBE_PLAYLIST_URL: z.string().trim().optional(),
		YOUTUBE_PLAYLIST_ID: z.string().trim().optional(),
		YOUTUBE_COOKIE: z.string().trim().optional(),
		YOUTUBE_USER_AGENT: z.string().trim().optional(),
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

export type Env = Omit<BaseEnv, 'PORT' | 'MOCKS' | 'DATABASE_PATH'> & {
	PORT: number
	MOCKS: boolean
	DATABASE_PATH: string
	allowedActionOrigins: string[]
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

	const productionOrigins = ['kentcdodds.com', '*.kentcdodds.com']
	// Fly.io app name is required by schema; keep the old behavior anyway.
	if (values.FLY_APP_NAME) {
		productionOrigins.push(`${values.FLY_APP_NAME}.fly.dev`)
	}
	return productionOrigins
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

export function getEnv(): Env {
	const keys = Object.keys(schemaBase.shape) as Array<keyof BaseEnv>
	const fingerprint = keys
		.map((k) => `${String(k)}=${process.env[String(k)] ?? ''}`)
		.join('\0')

	if (_cache?.fingerprint === fingerprint) return _cache.env

	const parsed = schema.safeParse(process.env)

	if (parsed.success === false) {
		// Prefer throwing the ZodError; `init()` prints a nicer message.
		throw parsed.error
	}

	const values = parsed.data
	const env: Env = {
		...values,
		PORT: Number(values.PORT),
		MOCKS: values.MOCKS === 'true',
		DATABASE_PATH: deriveDatabasePath(values),
		allowedActionOrigins: computeAllowedActionOrigins(values),
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
		} else {
			console.error('❌ Unexpected error while validating environment:', error)
		}
		throw new Error('Invalid environment variables')
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
	}
}

type PublicEnv = ReturnType<typeof getPublicEnv>

declare global {
	var ENV: PublicEnv
	interface Window {
		ENV: PublicEnv
	}
}
