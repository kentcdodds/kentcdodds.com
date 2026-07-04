import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { getEnv } from '#app/utils/env.server.ts'
import { getRuntimeBinding } from '#app/utils/runtime-bindings.server.ts'
import { Prisma } from './prisma-generated.server/client.ts'

function getPrismaAdapter({
	databaseUrl,
}: {
	databaseUrl?: string
} = {}): NonNullable<Prisma.PrismaClientOptions['adapter']> {
	const prismaRpc = getRuntimeBinding('PRISMA_RPC')
	if (
		prismaRpc &&
		typeof prismaRpc === 'object' &&
		typeof (prismaRpc as { query?: unknown }).query === 'function' &&
		typeof (prismaRpc as { raw?: unknown }).raw === 'function'
	) {
		throw new Error('PRISMA_RPC clients do not use a local Prisma adapter')
	}
	return new PrismaBetterSqlite3({ url: databaseUrl ?? getEnv().DATABASE_URL })
}

export { getPrismaAdapter }
