import 'dotenv/config'
import { defineConfig } from 'prisma/config'

function getDatabaseUrl() {
	const url = process.env.DATABASE_URL?.trim()
	if (url) return url

	// Keep Prisma CLI (generate/migrate) usable in CI and tooling even when
	// `DATABASE_URL` isn't explicitly set (for example: lint/typecheck jobs).
	// The runtime app still validates env via `getEnv()` and will fail-fast.
	const databasePath = process.env.DATABASE_PATH?.trim()
	if (databasePath) {
		return databasePath.startsWith('file:')
			? databasePath
			: `file:${databasePath}`
	}

	const databaseFilename = process.env.DATABASE_FILENAME?.trim()
	if (databaseFilename) {
		return `file:./prisma/${databaseFilename}`
	}

	return 'file:./prisma/sqlite.db'
}

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations',
		seed: 'tsx other/runfile prisma/seed.ts',
	},
	datasource: {
		url: getDatabaseUrl(),
	},
})
