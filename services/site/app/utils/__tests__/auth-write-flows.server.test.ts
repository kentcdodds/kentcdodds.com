import { expect, test, vi } from 'vitest'
import {
	callKentEpisodeDraftTable,
	callTable,
	sessionTable,
} from '../db/schema.server.ts'

async function loadWriteFlows() {
	vi.resetModules()
	const db = {
		exec: vi.fn(),
		deleteMany: vi.fn(),
		create: vi.fn(),
	}
	vi.doMock('../db.server.ts', () => ({ db }))
	const mod = await import('../auth-write-flows.server.ts')
	return { db, ...mod }
}

test('recordPublishedCallKentEpisode upserts the caller episode before deleting the raw call', async () => {
	const { db, recordPublishedCallKentEpisode } = await loadWriteFlows()
	db.exec.mockResolvedValue({ affectedRows: 1 })
	db.deleteMany.mockResolvedValue({ affectedRows: 1 })

	await recordPublishedCallKentEpisode({
		userId: 'user-1',
		callId: 'call-1',
		callTitle: 'Call title',
		callNotes: 'Call notes',
		isAnonymous: false,
		transistorEpisodeId: 'episode-1',
	})

	expect(db.exec).toHaveBeenCalledTimes(1)
	expect(db.deleteMany).toHaveBeenCalledWith(callTable, {
		where: { id: 'call-1' },
	})
	expect(db.exec.mock.invocationCallOrder[0]).toBeLessThan(
		db.deleteMany.mock.invocationCallOrder[0]!,
	)
})

test('replaceCallKentEpisodeDraft deletes any old draft before creating a new one', async () => {
	const { db, replaceCallKentEpisodeDraft } = await loadWriteFlows()
	const draft = { id: 'draft-1', callId: 'call-1' }
	db.deleteMany.mockResolvedValue({ affectedRows: 1 })
	db.create.mockResolvedValue(draft)

	await expect(
		replaceCallKentEpisodeDraft({
			callId: 'call-1',
			processingJobId: 'job-1',
		}),
	).resolves.toBe(draft)

	expect(db.deleteMany).toHaveBeenCalledWith(callKentEpisodeDraftTable, {
		where: { callId: 'call-1' },
	})
	expect(db.create).toHaveBeenCalledWith(
		callKentEpisodeDraftTable,
		{ callId: 'call-1', processingJobId: 'job-1' },
		{ returnRow: true },
	)
	expect(db.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
		db.create.mock.invocationCallOrder[0]!,
	)
})

test('upsertPasswordAndDeleteSessions retries session invalidation after saving the password', async () => {
	const { db, upsertPasswordAndDeleteSessions } = await loadWriteFlows()
	db.exec.mockResolvedValue({ affectedRows: 1 })
	db.deleteMany
		.mockRejectedValueOnce(new Error('temporary D1 failure'))
		.mockResolvedValueOnce({ affectedRows: 2 })

	await upsertPasswordAndDeleteSessions({
		userId: 'user-1',
		passwordHash: 'hash-1',
	})

	expect(db.exec).toHaveBeenCalledTimes(1)
	expect(db.deleteMany).toHaveBeenCalledTimes(2)
	expect(db.deleteMany).toHaveBeenNthCalledWith(1, sessionTable, {
		where: { userId: 'user-1' },
	})
	expect(db.deleteMany).toHaveBeenNthCalledWith(2, sessionTable, {
		where: { userId: 'user-1' },
	})
	expect(db.exec.mock.invocationCallOrder[0]).toBeLessThan(
		db.deleteMany.mock.invocationCallOrder[0]!,
	)
})
