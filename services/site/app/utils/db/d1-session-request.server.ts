import { getD1BookmarkFromRequest } from './d1-bookmark-cookie.server.ts'
import { getD1RpcBinding } from './d1-rpc-client.server.ts'
import {
	createDirectSessionBinding,
	type D1DatabaseSessionLike,
	type D1RpcSessionBinding,
} from './d1-sql-executor.server.ts'
import { getRuntimeBinding } from '../runtime-bindings.server.ts'

type D1DatabaseWithSession = {
	withSession(constraintOrBookmark?: string): D1DatabaseSessionLike
}

type D1RequestStore = {
	bookmark: string
	inboundBookmark: string | undefined
	session?: D1RpcSessionBinding
}

const activeD1RequestKey = Symbol.for('kentcdodds.activeD1RequestStore')

function getActiveD1RequestStore(): D1RequestStore | null {
	return (
		(globalThis as Record<symbol, D1RequestStore | undefined>)[
			activeD1RequestKey
		] ?? null
	)
}

function isDirectD1WithSession(value: unknown): value is D1DatabaseWithSession {
	if (!value || typeof value !== 'object') return false
	const database = value as Record<string, unknown>
	return typeof database.withSession === 'function'
}

function getDirectD1WithSession(): D1DatabaseWithSession | undefined {
	const binding = getRuntimeBinding('APP_DB')
	return isDirectD1WithSession(binding) ? binding : undefined
}

export function getRequestD1Session(): D1RpcSessionBinding | undefined {
	return getActiveD1RequestStore()?.session
}

export function getRequestD1Bookmark(): string | undefined {
	return getActiveD1RequestStore()?.bookmark
}

export function setRequestD1Bookmark(bookmark: string | null | undefined) {
	const store = getActiveD1RequestStore()
	if (!store || !bookmark) return
	store.bookmark = bookmark
}

export function getInboundD1Bookmark(): string | undefined {
	return getActiveD1RequestStore()?.inboundBookmark
}

export async function runWithD1RequestContext<T>(
	request: Request,
	fn: () => Promise<T>,
): Promise<T> {
	const inboundBookmark = getD1BookmarkFromRequest(request)
	const rpc = getD1RpcBinding()
	const store: D1RequestStore = {
		bookmark: inboundBookmark ?? 'first-unconstrained',
		inboundBookmark,
	}

	if (!rpc) {
		const directD1 = getDirectD1WithSession()
		if (directD1) {
			store.session = createDirectSessionBinding(
				directD1.withSession(store.bookmark),
			)
		} else {
			return fn()
		}
	}

	;(globalThis as Record<symbol, D1RequestStore>)[activeD1RequestKey] = store
	try {
		return await fn()
	} finally {
		delete (globalThis as Record<symbol, unknown>)[activeD1RequestKey]
	}
}

export async function getOutboundD1Bookmark(): Promise<string | null> {
	const store = getActiveD1RequestStore()
	if (!store) return null
	if (store.session) {
		const sessionBookmark = await store.session.getBookmark()
		if (sessionBookmark) return sessionBookmark
	}
	return store.bookmark ?? null
}
