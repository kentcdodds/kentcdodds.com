import { expect, test } from 'vitest'
import {
	clearRuntimeBindingSource,
	getRuntimeBinding,
	setRuntimeBindingSource,
} from '../runtime-bindings.server.ts'

test('runtime bindings can be set and cleared', () => {
	expect(getRuntimeBinding('DB')).toBeUndefined()

	const dbBinding = { prepare: () => null }
	setRuntimeBindingSource({ DB: dbBinding, ANYTHING: 123 })

	expect(getRuntimeBinding('DB')).toBe(dbBinding)
	expect(getRuntimeBinding<number>('ANYTHING')).toBe(123)

	clearRuntimeBindingSource()
	expect(getRuntimeBinding('DB')).toBeUndefined()
})
