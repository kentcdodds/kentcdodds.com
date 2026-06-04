import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getEnv } from '#app/utils/env.server.ts'
import { getRuntimeBinding } from '#app/utils/runtime-bindings.server.ts'
import { Prisma } from './prisma-generated.server/client.ts'

function getPrismaAdapter({
	appDbBinding = getRuntimeBinding('APP_DB'),
	databaseUrl = getEnv().DATABASE_URL,
}: {
	appDbBinding?: unknown
	databaseUrl?: string
} = {}): NonNullable<Prisma.PrismaClientOptions['adapter']> {
	if (isD1Database(appDbBinding)) {
		return new PrismaD1(appDbBinding as ConstructorParameters<typeof PrismaD1>[0])
	}
	return new PrismaBetterSqlite3({ url: databaseUrl })
}

function isD1Database(value: unknown) {
	if (!value || typeof value !== 'object') return false
	const binding = value as Record<string, unknown>
	return ['prepare', 'batch', 'exec', 'dump', 'withSession'].every(
		(method) => typeof binding[method] === 'function',
	)
}

export { getPrismaAdapter }
