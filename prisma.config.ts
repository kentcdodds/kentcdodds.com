import 'dotenv/config'
import { defineConfig } from 'prisma/config'

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
	throw new Error('DATABASE_URL is required (no default fallback)')
}

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations',
		seed: 'tsx other/runfile prisma/seed.ts',
	},
	datasource: {
		url: databaseUrl,
	},
})
