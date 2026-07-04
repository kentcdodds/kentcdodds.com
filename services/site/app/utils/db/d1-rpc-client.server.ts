import { getRuntimeBinding } from '#app/utils/runtime-bindings.server.ts'
import type { D1RpcBinding } from './d1-sql-executor.server.ts'

function isD1RpcBinding(value: unknown): value is D1RpcBinding {
	if (!value || typeof value !== 'object') return false
	const binding = value as Record<string, unknown>
	return (
		typeof binding.query === 'function' &&
		typeof binding.run === 'function' &&
		typeof binding.batch === 'function'
	)
}

export function getD1RpcBinding(): D1RpcBinding | undefined {
	const binding = getRuntimeBinding('D1_RPC')
	return isD1RpcBinding(binding) ? binding : undefined
}
