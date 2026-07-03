import { WorkerEntrypoint } from 'cloudflare:workers'
import { harnessModules } from './harness-modules.generated.mjs'

const PRISMA_SIDECAR_URL = 'http://127.0.0.1:3101'

export class PrismaRpc extends WorkerEntrypoint {
	async query(model, operation, args) {
		const response = await fetch(`${PRISMA_SIDECAR_URL}/query`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ model, operation, args }),
		})
		return await response.json()
	}

	async raw(method, query, values = []) {
		const response = await fetch(`${PRISMA_SIDECAR_URL}/raw`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ method, query, values }),
		})
		return await response.json()
	}
}

const cacheStore = new Map()

export class CacheRpc extends WorkerEntrypoint {
	async get(key) {
		return cacheStore.get(key) ?? null
	}

	async set(key, entry) {
		cacheStore.set(key, entry)
	}

	async delete(key) {
		cacheStore.delete(key)
	}

	async keys(prefix = '', limit = 1000) {
		const keys = [...cacheStore.keys()].filter((key) => key.startsWith(prefix))
		return keys.slice(0, limit)
	}
}

export class OutboundProxy extends WorkerEntrypoint {
	async fetch(request) {
		return fetch(request)
	}
}

function buildModuleMap() {
	const map = {}
	for (const [name, source] of Object.entries(harnessModules)) {
		map[name] = { js: source }
	}
	return map
}

const moduleMap = buildModuleMap()

function getStringEnv(sourceEnv) {
	return Object.fromEntries(
		Object.entries(sourceEnv).filter(([, value]) => typeof value === 'string'),
	)
}

export default {
	async fetch(request, env, ctx) {
		if (!env.LOADER) {
			return Response.json(
				{ ok: false, error: 'LOADER binding missing' },
				{ status: 500 },
			)
		}

		const worker = env.LOADER.get('harness-app', () => ({
			compatibilityDate: '2026-03-17',
			compatibilityFlags: ['nodejs_compat'],
			mainModule: 'app-worker.js',
			modules: moduleMap,
			env: {
				...getStringEnv(env),
				MDX_MODULES_AVAILABLE: 'true',
				PRISMA_RPC: ctx.exports.PrismaRpc({ props: {} }),
				CACHE_RPC: ctx.exports.CacheRpc({ props: {} }),
			},
			globalOutbound: ctx.exports.OutboundProxy({ props: {} }),
		}))

		return worker.getEntrypoint().fetch(request)
	},
}
