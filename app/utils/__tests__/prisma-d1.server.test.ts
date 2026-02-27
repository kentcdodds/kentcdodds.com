import { expect, test } from 'vitest'
import { createPrismaClientForD1 } from '#app/utils/prisma.server.ts'

test('createPrismaClientForD1 creates a Prisma client instance', async () => {
	const fakeStatement = {
		bind: () => fakeStatement,
		first: async () => null,
		all: async () => ({ results: [] as Array<unknown> }),
		raw: async () => [] as Array<unknown>,
		run: async () => ({ success: true }),
	}
	const fakeD1Binding = {
		prepare: () => fakeStatement,
		batch: async () => [] as Array<unknown>,
		dump: async () => new ArrayBuffer(0),
	}

	const client = createPrismaClientForD1(fakeD1Binding as never)

	expect(typeof client.$disconnect).toBe('function')
	await client.$disconnect()
})
