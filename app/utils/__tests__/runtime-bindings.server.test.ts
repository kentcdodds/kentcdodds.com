import { expect, test } from 'vitest'
import {
	clearRuntimeBindingSource,
	getRuntimeBinding,
	setRuntimeBindingSource,
} from '../runtime-bindings.server.ts'

test('runtime bindings can be set and cleared', () => {
	expect(getRuntimeBinding('APP_DB')).toBeUndefined()

	const dbBinding = { prepare: () => null }
	setRuntimeBindingSource({ APP_DB: dbBinding, ANYTHING: 123 })

	expect(getRuntimeBinding('APP_DB')).toBe(dbBinding)
	expect(getRuntimeBinding<number>('ANYTHING')).toBe(123)

	clearRuntimeBindingSource()
	expect(getRuntimeBinding('APP_DB')).toBeUndefined()
})
