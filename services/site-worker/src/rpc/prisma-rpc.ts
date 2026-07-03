import { WorkerEntrypoint } from 'cloudflare:workers'
import { PrismaD1 } from '@prisma/adapter-d1'
import { Prisma, PrismaClient } from '../../generated/prisma-client/client.ts'
import type { ParentWorkerEnv } from './types.ts'

let prismaClient: PrismaClient | undefined

function getPrismaClient(env: ParentWorkerEnv) {
	if (!prismaClient) {
		prismaClient = new PrismaClient({
			adapter: new PrismaD1(env.APP_DB),
		})
	}
	return prismaClient
}

function isPrismaClientError(error: unknown): error is {
	name: string
	code: string
	message: string
	meta?: unknown
	clientVersion?: string
} {
	return (
		typeof error === 'object' &&
		error !== null &&
		'name' in error &&
		'code' in error &&
		'message' in error &&
		typeof (error as { name: unknown }).name === 'string' &&
		typeof (error as { code: unknown }).code === 'string' &&
		typeof (error as { message: unknown }).message === 'string'
	)
}

function toPrismaRpcError(error: unknown) {
	if (isPrismaClientError(error)) {
		return {
			ok: false as const,
			error: {
				name: error.name,
				code: error.code,
				message: error.message,
				meta: (error.meta as Record<string, unknown> | undefined) ?? {},
				clientVersion: error.clientVersion ?? Prisma.prismaVersion.client,
			},
		}
	}

	if (error instanceof Prisma.PrismaClientValidationError) {
		return {
			ok: false as const,
			error: {
				name: error.name,
				code: 'P2009',
				message: error.message,
				meta: {},
				clientVersion: Prisma.prismaVersion.client,
			},
		}
	}

	throw error
}

export class PrismaRpc extends WorkerEntrypoint<ParentWorkerEnv> {
	async query(model: string, operation: string, args: unknown) {
		try {
			const prisma = getPrismaClient(this.env)
			const delegate = (
				prisma as unknown as Record<string, Record<string, unknown>>
			)[model]
			const method = delegate?.[operation]
			if (typeof method !== 'function') {
				return {
					ok: false as const,
					error: {
						name: 'PrismaClientValidationError',
						code: 'P2009',
						message: `Unknown model operation ${model}.${operation}`,
						meta: {},
						clientVersion: Prisma.prismaVersion.client,
					},
				}
			}

			const result = await (
				method as (value: unknown) => Promise<unknown>
			).call(delegate, args)
			return { ok: true as const, result }
		} catch (error) {
			return toPrismaRpcError(error)
		}
	}

	async raw(
		kind: 'queryRawUnsafe' | 'executeRawUnsafe',
		sql: string,
		params: unknown[],
	) {
		try {
			const prisma = getPrismaClient(this.env)
			const method = prisma.$queryRawUnsafe
			if (kind === 'executeRawUnsafe') {
				const result = await prisma.$executeRawUnsafe(sql, ...params)
				return { ok: true as const, result }
			}

			const result = await method.call(prisma, sql, ...params)
			return { ok: true as const, result }
		} catch (error) {
			return toPrismaRpcError(error)
		}
	}
}

export function getParentPrismaClient(env: ParentWorkerEnv) {
	return getPrismaClient(env)
}
