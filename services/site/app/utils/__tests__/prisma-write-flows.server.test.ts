import { expect, test, vi } from 'vitest'

async function loadWriteFlows() {
	vi.resetModules()
	const prisma = {
		callKentCallerEpisode: {
			upsert: vi.fn(),
		},
		call: {
			deleteMany: vi.fn(),
		},
		callKentEpisodeDraft: {
			deleteMany: vi.fn(),
			create: vi.fn(),
		},
		password: {
			upsert: vi.fn(),
		},
		session: {
			deleteMany: vi.fn(),
		},
	}
	vi.doMock('../prisma.server.ts', () => ({ prisma }))
	const mod = await import('../prisma-write-flows.server.ts')
	return { prisma, ...mod }
}

test('recordPublishedCallKentEpisode upserts the caller episode before deleting the raw call', async () => {
	const { prisma, recordPublishedCallKentEpisode } = await loadWriteFlows()
	prisma.callKentCallerEpisode.upsert.mockResolvedValue({})
	prisma.call.deleteMany.mockResolvedValue({ count: 1 })

	await recordPublishedCallKentEpisode({
		userId: 'user-1',
		callId: 'call-1',
		callTitle: 'Call title',
		callNotes: 'Call notes',
		isAnonymous: false,
		transistorEpisodeId: 'episode-1',
	})

	expect(prisma.callKentCallerEpisode.upsert).toHaveBeenCalledWith({
		where: { transistorEpisodeId: 'episode-1' },
		create: {
			userId: 'user-1',
			callTitle: 'Call title',
			callNotes: 'Call notes',
			isAnonymous: false,
			transistorEpisodeId: 'episode-1',
		},
		update: {
			userId: 'user-1',
			callTitle: 'Call title',
			callNotes: 'Call notes',
			isAnonymous: false,
		},
	})
	expect(prisma.call.deleteMany).toHaveBeenCalledWith({
		where: { id: 'call-1' },
	})
	expect(
		prisma.callKentCallerEpisode.upsert.mock.invocationCallOrder[0],
	).toBeLessThan(prisma.call.deleteMany.mock.invocationCallOrder[0]!)
})

test('replaceCallKentEpisodeDraft deletes any old draft before creating a new one', async () => {
	const { prisma, replaceCallKentEpisodeDraft } = await loadWriteFlows()
	const draft = { id: 'draft-1', callId: 'call-1' }
	prisma.callKentEpisodeDraft.deleteMany.mockResolvedValue({ count: 1 })
	prisma.callKentEpisodeDraft.create.mockResolvedValue(draft)

	await expect(replaceCallKentEpisodeDraft({ callId: 'call-1' })).resolves.toBe(
		draft,
	)

	expect(prisma.callKentEpisodeDraft.deleteMany).toHaveBeenCalledWith({
		where: { callId: 'call-1' },
	})
	expect(prisma.callKentEpisodeDraft.create).toHaveBeenCalledWith({
		data: { callId: 'call-1' },
	})
	expect(
		prisma.callKentEpisodeDraft.deleteMany.mock.invocationCallOrder[0],
	).toBeLessThan(
		prisma.callKentEpisodeDraft.create.mock.invocationCallOrder[0]!,
	)
})

test('upsertPasswordAndDeleteSessions retries session invalidation after saving the password', async () => {
	const { prisma, upsertPasswordAndDeleteSessions } = await loadWriteFlows()
	prisma.password.upsert.mockResolvedValue({})
	prisma.session.deleteMany
		.mockRejectedValueOnce(new Error('temporary D1 failure'))
		.mockResolvedValueOnce({ count: 2 })

	await upsertPasswordAndDeleteSessions({
		userId: 'user-1',
		passwordHash: 'hash-1',
	})

	expect(prisma.password.upsert).toHaveBeenCalledWith({
		where: { userId: 'user-1' },
		update: { hash: 'hash-1' },
		create: { userId: 'user-1', hash: 'hash-1' },
	})
	expect(prisma.session.deleteMany).toHaveBeenCalledTimes(2)
	expect(prisma.session.deleteMany).toHaveBeenNthCalledWith(1, {
		where: { userId: 'user-1' },
	})
	expect(prisma.session.deleteMany).toHaveBeenNthCalledWith(2, {
		where: { userId: 'user-1' },
	})
	expect(prisma.password.upsert.mock.invocationCallOrder[0]).toBeLessThan(
		prisma.session.deleteMany.mock.invocationCallOrder[0]!,
	)
})
