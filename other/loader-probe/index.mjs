// Temporary probe worker validating Worker Loader behavior needed by the
// Cloudflare site migration:
// 1. worker_loaders binding is deployable on this account
// 2. plain vars pass through dynamic worker env
// 3. ctx.exports loopback entrypoints support RPC from the dynamic worker
// 4. dynamic import() of module-map modules works at request time
// 5. WASM modules can be included in the module map and instantiated
// 6. request-time eval/new Function is blocked inside dynamic workers
import { WorkerEntrypoint } from 'cloudflare:workers'

// 41-byte wasm module exporting add(i32, i32) -> i32
const ADD_WASM = new Uint8Array([
	0, 97, 115, 109, 1, 0, 0, 0, 1, 7, 1, 96, 2, 127, 127, 1, 127, 3, 2, 1, 0,
	7, 7, 1, 3, 97, 100, 100, 0, 0, 10, 9, 1, 7, 0, 32, 0, 32, 1, 106, 11,
])

const DYNAMIC_MAIN = `
import { helper } from './lib.mjs'

export default {
	async fetch(request, env) {
		const results = { helper: null, dynamicImport: null, rpc: null, plainVar: null, wasm: null, evalBlocked: null, outboundFetch: null }
		try { results.helper = helper() } catch (e) { results.helper = 'ERR: ' + e.message }
		try {
			const mod = await import('./lazy.mjs')
			results.dynamicImport = mod.value
		} catch (e) { results.dynamicImport = 'ERR: ' + e.message }
		try { results.rpc = await env.PARENT.ping('from-dynamic') } catch (e) { results.rpc = 'ERR: ' + e.message }
		results.plainVar = env.PLAIN ?? 'MISSING'
		try {
			const wasmModule = (await import('./add.wasm')).default
			const instance = await WebAssembly.instantiate(wasmModule)
			results.wasm = instance.exports.add(20, 22)
		} catch (e) { results.wasm = 'ERR: ' + e.message }
		try {
			const fn = new Function('return 42')
			results.evalBlocked = 'NOT BLOCKED: ' + fn()
		} catch (e) { results.evalBlocked = 'blocked: ' + e.message }
		try {
			const res = await fetch('https://kentcdodds.com/healthcheck')
			results.outboundFetch = res.status + ':' + (await res.text()).slice(0, 10)
		} catch (e) { results.outboundFetch = 'ERR: ' + e.message }
		return Response.json(results)
	},
}
`

const DYNAMIC_LIB = `export function helper() { return 'lib-ok' }`
const DYNAMIC_LAZY = `export const value = 'dynamic-import-ok'`

export class ProbeParent extends WorkerEntrypoint {
	async ping(message) {
		return `pong:${message}`
	}
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url)
		if (url.pathname !== '/probe') {
			return Response.json({ ok: true, probe: '/probe' })
		}
		const report = { loaderBindingPresent: Boolean(env.LOADER) }
		try {
			const worker = env.LOADER.get(
				url.searchParams.get('id') ?? 'probe-v1',
				async () => ({
					compatibilityDate: '2026-03-17',
					mainModule: 'main.mjs',
					modules: {
						'main.mjs': DYNAMIC_MAIN,
						'lib.mjs': DYNAMIC_LIB,
						'lazy.mjs': DYNAMIC_LAZY,
						'add.wasm': ADD_WASM,
					},
					env: {
						PLAIN: 'plain-var-ok',
						PARENT: ctx.exports.ProbeParent({ props: {} }),
					},
				}),
			)
			const entrypoint = worker.getEntrypoint()
			const start = Date.now()
			const response = await entrypoint.fetch(new Request('https://dynamic.probe/'))
			report.dynamicWorker = await response.json()
			report.dynamicFetchMs = Date.now() - start
		} catch (error) {
			report.loaderError = String(error && error.stack ? error.stack : error)
		}
		return Response.json(report)
	},
}
