import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations',
		seed: 'tsx other/runfile prisma/seed.ts',
	},
	datasource: {
		url: process.env.DATABASE_URL || 'file:./prisma/sqlite.db',
	},
})
