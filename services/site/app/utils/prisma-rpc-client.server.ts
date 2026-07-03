import { getRuntimeBinding } from '#app/utils/runtime-bindings.server.ts'
import {
	Prisma,
	type PrismaClient,
} from './prisma-generated.server/client.ts'

type PrismaRpcError = {
	name: string
	code?: string
	message: string
	meta?: unknown
	clientVersion?: string
}

type PrismaRpcResult<T> =
	| { ok: true; result: T }
	| { ok: false; error: PrismaRpcError }

export type PrismaRpcBinding = {
	query(
		model: string,
		operation: string,
		args?: unknown,
	): Promise<PrismaRpcResult<unknown>>
	raw(
		method: string,
		query: unknown,
		values?: Array<unknown>,
	): Promise<PrismaRpcResult<unknown>>
}

function unwrapRpcResult<T>(result: PrismaRpcResult<T>): T {
	if (result.ok) return result.result
	const error = new Error(result.error.message)
	error.name = result.error.name
	if (result.error.code) {
		;(error as Error & { code?: string }).code = result.error.code
	}
	if (result.error.meta !== undefined) {
		;(error as Error & { meta?: unknown }).meta = result.error.meta
	}
	if (result.error.clientVersion) {
		;(error as Error & { clientVersion?: string }).clientVersion =
			result.error.clientVersion
	}
	throw error
}

function isPrismaRpcBinding(value: unknown): value is PrismaRpcBinding {
	if (!value || typeof value !== 'object') return false
	const binding = value as Record<string, unknown>
	return (
		typeof binding.query === 'function' && typeof binding.raw === 'function'
	)
}

export function getPrismaRpcBinding(): PrismaRpcBinding | undefined {
	const binding = getRuntimeBinding('PRISMA_RPC')
	return isPrismaRpcBinding(binding) ? binding : undefined
}

function createModelProxy(rpc: PrismaRpcBinding, model: string) {
	return new Proxy(
		{},
		{
			get(_target, operation) {
				if (typeof operation !== 'string') return undefined
				return (args?: unknown) =>
					rpc.query(model, operation, args).then(unwrapRpcResult)
			},
		},
	)
}

export function createPrismaRpcClient(rpc: PrismaRpcBinding): PrismaClient {
	const noop = async () => undefined
	const client = new Proxy(
		{},
		{
			get(_target, prop) {
				if (prop === '$connect' || prop === '$disconnect' || prop === '$on') {
					return noop
				}
				if (prop === '$transaction') {
					return (operations: Array<Promise<unknown>>) =>
						Promise.all(operations)
				}
				if (prop === '$extends') {
					return () => client
				}
				if (prop === '$queryRaw' || prop === '$executeRaw') {
					return (query: unknown, ...values: Array<unknown>) =>
						rpc
							.raw(String(prop), query, values)
							.then(unwrapRpcResult)
				}
				if (prop === '$queryRawUnsafe' || prop === '$executeRawUnsafe') {
					return (query: string, ...values: Array<unknown>) =>
						rpc
							.raw(String(prop), query, values)
							.then(unwrapRpcResult)
				}
				if (typeof prop === 'string' && !prop.startsWith('$')) {
					return createModelProxy(rpc, prop)
				}
				return undefined
			},
		},
	)
	return client as PrismaClient
}

export function isPrismaKnownRequestError(
	error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
	return error instanceof Prisma.PrismaClientKnownRequestError
}
