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

function coerceTemplateStringsArray(value: unknown): TemplateStringsArray {
	if (
		typeof value === 'object' &&
		value !== null &&
		Array.isArray((value as TemplateStringsArray).raw)
	) {
		return value as TemplateStringsArray
	}

	if (Array.isArray(value) && value.every((part) => typeof part === 'string')) {
		const strings = value as string[]
		const template = [...strings] as unknown as TemplateStringsArray
		Object.defineProperty(template, 'raw', { value: [...strings] })
		return template
	}

	throw new Prisma.PrismaClientValidationError(
		'Invalid $queryRaw template strings payload',
		{ clientVersion: Prisma.prismaVersion.client },
	)
}

function reviveDates(value: unknown): unknown {
	if (value === null || value === undefined) return value
	if (
		typeof value === 'string' &&
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
	) {
		return new Date(value)
	}
	if (Array.isArray(value)) return value.map(reviveDates)
	if (typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [key, reviveDates(entry)]),
		)
	}
	return value
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
			return { ok: true as const, result: reviveDates(result) }
		} catch (error) {
			return toPrismaRpcError(error)
		}
	}

	async raw(method: string, query: unknown, values: unknown[] = []) {
		try {
			const prisma = getPrismaClient(this.env)

			if (method === '$queryRaw' || method === '$executeRaw') {
				const fn = (
					prisma as unknown as Record<
						string,
						| ((strings: TemplateStringsArray, ...params: unknown[]) => Promise<unknown>)
						| undefined
					>
				)[method]
				if (!fn) {
					return {
						ok: false as const,
						error: {
							name: 'PrismaClientValidationError',
							code: 'P2009',
							message: `Prisma raw method ${method} is not available`,
							meta: {},
							clientVersion: Prisma.prismaVersion.client,
						},
					}
				}
				const strings = coerceTemplateStringsArray(query)
				const result = await fn.call(prisma, strings, ...values)
				return { ok: true as const, result: reviveDates(result) }
			}

			if (method === '$queryRawUnsafe' || method === '$executeRawUnsafe') {
				const fn = (
					prisma as unknown as Record<
						string,
						| ((sql: string, ...params: unknown[]) => Promise<unknown>)
						| undefined
					>
				)[method]
				if (!fn) {
					return {
						ok: false as const,
						error: {
							name: 'PrismaClientValidationError',
							code: 'P2009',
							message: `Prisma raw method ${method} is not available`,
							meta: {},
							clientVersion: Prisma.prismaVersion.client,
						},
					}
				}
				const result = await fn.call(prisma, query as string, ...values)
				return { ok: true as const, result: reviveDates(result) }
			}

			return {
				ok: false as const,
				error: {
					name: 'PrismaClientValidationError',
					code: 'P2009',
					message: `Unknown raw Prisma method ${method}`,
					meta: {},
					clientVersion: Prisma.prismaVersion.client,
				},
			}
		} catch (error) {
			return toPrismaRpcError(error)
		}
	}
}

export function getParentPrismaClient(env: ParentWorkerEnv) {
	return getPrismaClient(env)
}
