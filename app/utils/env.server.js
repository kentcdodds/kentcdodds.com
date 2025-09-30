"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
exports.getEnv = getEnv;
var zod_1 = require("zod");
var schema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['production', 'development', 'test']),
    DATABASE_PATH: zod_1.z.string(),
    DATABASE_URL: zod_1.z.string(),
    CACHE_DATABASE_PATH: zod_1.z.string(),
    BOT_GITHUB_TOKEN: zod_1.z.string(),
    CALL_KENT_PODCAST_ID: zod_1.z.string(),
    CHATS_WITH_KENT_PODCAST_ID: zod_1.z.string(),
    KIT_API_KEY: zod_1.z.string(),
    KIT_API_SECRET: zod_1.z.string(),
    DISCORD_ADMIN_USER_ID: zod_1.z.string(),
    DISCORD_BLUE_CHANNEL: zod_1.z.string(),
    DISCORD_BLUE_ROLE: zod_1.z.string(),
    DISCORD_BOT_TOKEN: zod_1.z.string(),
    DISCORD_CALL_KENT_CHANNEL: zod_1.z.string(),
    DISCORD_CLIENT_ID: zod_1.z.string(),
    DISCORD_CLIENT_SECRET: zod_1.z.string(),
    DISCORD_GUILD_ID: zod_1.z.string(),
    DISCORD_LEADERBOARD_CHANNEL: zod_1.z.string(),
    DISCORD_MEMBER_ROLE: zod_1.z.string(),
    DISCORD_PRIVATE_BOT_CHANNEL: zod_1.z.string(),
    DISCORD_RED_CHANNEL: zod_1.z.string(),
    DISCORD_RED_ROLE: zod_1.z.string(),
    DISCORD_SCOPES: zod_1.z.string(),
    DISCORD_YELLOW_CHANNEL: zod_1.z.string(),
    DISCORD_YELLOW_ROLE: zod_1.z.string(),
    FLY_CONSUL_URL: zod_1.z.string(),
    INTERNAL_COMMAND_TOKEN: zod_1.z.string(),
    MAGIC_LINK_SECRET: zod_1.z.string(),
    MAILGUN_DOMAIN: zod_1.z.string(),
    MAILGUN_SENDING_KEY: zod_1.z.string(),
    REFRESH_CACHE_SECRET: zod_1.z.string(),
    SENTRY_AUTH_TOKEN: zod_1.z.string(),
    SENTRY_DSN: zod_1.z.string(),
    SENTRY_ORG: zod_1.z.string(),
    SENTRY_PROJECT: zod_1.z.string(),
    SENTRY_PROJECT_ID: zod_1.z.string(),
    SESSION_SECRET: zod_1.z.string(),
    SIMPLECAST_KEY: zod_1.z.string(),
    TITO_API_SECRET: zod_1.z.string(),
    TRANSISTOR_API_SECRET: zod_1.z.string(),
    TWITTER_BEARER_TOKEN: zod_1.z.string(),
    VERIFIER_API_KEY: zod_1.z.string(),
    CF_INTERNAL_SECRET: zod_1.z.string(),
});
function init() {
    var parsed = schema.safeParse(process.env);
    if (parsed.success === false) {
        console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
        throw new Error('Invalid environment variables');
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
function getEnv() {
    return {
        FLY: process.env.FLY,
        MODE: process.env.NODE_ENV,
        NODE_ENV: process.env.NODE_ENV,
        DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
        SENTRY_DSN: process.env.SENTRY_DSN,
    };
}
