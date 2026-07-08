import { afterEach, expect, test } from 'vitest'
import { getDatabaseClient } from '../../db.server.ts'
import { clearRuntimeBindingSource } from '../../runtime-bindings.server.ts'

afterEach(() => {
	clearRuntimeBindingSource()
})

test('getDatabaseClient uses node:sqlite when no D1 RPC binding is present', () => {
	const client = getDatabaseClient()
	expect(client.adapter.dialect).toBe('sqlite')
})
