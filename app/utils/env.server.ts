function getEnv() {
	return {
		FLY: process.env.FLY,
		MODE: process.env.NODE_ENV,
		NODE_ENV: process.env.NODE_ENV,
		DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
		SENTRY_DSN: process.env.SENTRY_DSN,
	}
}

type ENV = ReturnType<typeof getEnv>

// App puts these on
declare global {
	var ENV: ENV
	interface Window {
		ENV: ENV
	}
}

export { getEnv }
