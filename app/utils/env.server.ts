import { z } from 'zod'

const schema = z.object({
	NODE_ENV: z.enum(['production', 'development', 'test'] as const),
	DATABASE_PATH: z.string(),
	DATABASE_URL: z.string(),
	CACHE_DATABASE_PATH: z.string(),

	BOT_GITHUB_TOKEN: z.string(),
	CALL_KENT_PODCAST_ID: z.string(),
	CHATS_WITH_KENT_PODCAST_ID: z.string(),
	CONVERT_KIT_API_KEY: z.string(),
	CONVERT_KIT_API_SECRET: z.string(),
	DISCORD_ADMIN_USER_ID: z.string(),
	DISCORD_BLUE_CHANNEL: z.string(),
	DISCORD_BLUE_ROLE: z.string(),
	DISCORD_BOT_TOKEN: z.string(),
	DISCORD_CALL_KENT_CHANNEL: z.string(),
	DISCORD_CLIENT_ID: z.string(),
	DISCORD_CLIENT_SECRET: z.string(),
	DISCORD_GUILD_ID: z.string(),
	DISCORD_LEADERBOARD_CHANNEL: z.string(),
	DISCORD_MEMBER_ROLE: z.string(),
	DISCORD_PRIVATE_BOT_CHANNEL: z.string(),
	DISCORD_RED_CHANNEL: z.string(),
	DISCORD_RED_ROLE: z.string(),
	DISCORD_SCOPES: z.string(),
	DISCORD_YELLOW_CHANNEL: z.string(),
	DISCORD_YELLOW_ROLE: z.string(),
	FLY_CONSUL_URL: z.string(),
	INTERNAL_COMMAND_TOKEN: z.string(),
	MAGIC_LINK_SECRET: z.string(),
	MAILGUN_DOMAIN: z.string(),
	MAILGUN_SENDING_KEY: z.string(),
	METRONOME_API_KEY: z.string(),
	REFRESH_CACHE_SECRET: z.string(),
	SENTRY_AUTH_TOKEN: z.string(),
	SENTRY_DSN: z.string(),
	SENTRY_ORG: z.string(),
	SENTRY_PROJECT: z.string(),
	SENTRY_PROJECT_ID: z.string(),
	SESSION_SECRET: z.string(),
	SIMPLECAST_KEY: z.string(),
	TITO_API_SECRET: z.string(),
	TRANSISTOR_API_SECRET: z.string(),
	TWITTER_BEARER_TOKEN: z.string(),
	VERIFIER_API_KEY: z.string(),
})

declare global {
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof schema> {}
	}
}

export function init() {
	const parsed = schema.safeParse(process.env)

	if (parsed.success === false) {
		console.error(
			'❌ Invalid environment variables:',
			parsed.error.flatten().fieldErrors,
		)

		throw new Error('Invalid environment variables')
	}
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
export function getEnv() {
	return {
		FLY: process.env.FLY,
		MODE: process.env.NODE_ENV,
		NODE_ENV: process.env.NODE_ENV,
		DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
		SENTRY_DSN: process.env.SENTRY_DSN,
	}
}

type ENV = ReturnType<typeof getEnv>

declare global {
	var ENV: ENV
	interface Window {
		ENV: ENV
	}
}
