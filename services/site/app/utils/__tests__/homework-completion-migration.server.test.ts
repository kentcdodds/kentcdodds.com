import { expect, test, vi } from 'vitest'
import { homeworkCompletionTable } from '../db/schema.server.ts'

async function loadMigration() {
	vi.resetModules()
	const db = {
		findMany: vi.fn(),
		findOne: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		deleteMany: vi.fn(),
	}
	const isUniqueConstraintError = vi.fn()
	vi.doMock('../db.server.ts', () => ({ db, isUniqueConstraintError }))
	const mod = await import('../homework-completion-migration.server.ts')
	return { db, isUniqueConstraintError, ...mod }
}

test('migrates anonymous homework completions sequentially before deleting client rows', async () => {
	const { db, migrateHomeworkCompletionsToUser } = await loadMigration()
	db.findMany.mockResolvedValue([
		{
			id: 'row-1',
			seasonNumber: 7,
			episodeNumber: 1,
			itemIndex: 0,
			clientId: 'client-1',
		},
		{
			id: 'row-2',
			seasonNumber: 7,
			episodeNumber: 1,
			itemIndex: 1,
			clientId: 'client-1',
		},
	])
	db.findOne.mockResolvedValue(null)
	db.create.mockResolvedValue({})
	db.deleteMany.mockResolvedValue({ affectedRows: 2 })

	const count = await migrateHomeworkCompletionsToUser({
		userId: 'user-1',
		clientId: 'client-1',
	})

	expect(count).toBe(2)
	expect(db.findMany).toHaveBeenCalledWith(homeworkCompletionTable, {
		where: { clientId: 'client-1' },
	})
	expect(db.findOne).toHaveBeenCalledTimes(2)
	expect(db.create).toHaveBeenCalledTimes(2)
	expect(db.create).toHaveBeenNthCalledWith(
		1,
		homeworkCompletionTable,
		{
			userId: 'user-1',
			seasonNumber: 7,
			episodeNumber: 1,
			itemIndex: 0,
		},
		{ returnRow: true },
	)
	expect(db.deleteMany).toHaveBeenCalledWith(homeworkCompletionTable, {
		where: { clientId: 'client-1' },
	})
	expect(db.create.mock.invocationCallOrder.at(-1)).toBeLessThan(
		db.deleteMany.mock.invocationCallOrder[0]!,
	)
})

test('does not delete anonymous homework rows when there is nothing to migrate', async () => {
	const { db, migrateHomeworkCompletionsToUser } = await loadMigration()
	db.findMany.mockResolvedValue([])

	const count = await migrateHomeworkCompletionsToUser({
		userId: 'user-1',
		clientId: 'client-1',
	})

	expect(count).toBe(0)
	expect(db.findOne).not.toHaveBeenCalled()
	expect(db.create).not.toHaveBeenCalled()
	expect(db.deleteMany).not.toHaveBeenCalled()
})

test('ignores unique races and still deletes anonymous homework rows after all upserts finish', async () => {
	const { db, isUniqueConstraintError, migrateHomeworkCompletionsToUser } =
		await loadMigration()
	const uniqueError = new Error('unique conflict')
	db.findMany.mockResolvedValue([
		{
			id: 'row-1',
			seasonNumber: 7,
			episodeNumber: 1,
			itemIndex: 0,
			clientId: 'client-1',
		},
		{
			id: 'row-2',
			seasonNumber: 7,
			episodeNumber: 1,
			itemIndex: 1,
			clientId: 'client-1',
		},
	])
	db.findOne.mockResolvedValue(null)
	db.create.mockRejectedValueOnce(uniqueError).mockResolvedValueOnce({})
	isUniqueConstraintError.mockImplementation((error) => error === uniqueError)
	db.deleteMany.mockResolvedValue({ affectedRows: 2 })

	const count = await migrateHomeworkCompletionsToUser({
		userId: 'user-1',
		clientId: 'client-1',
	})

	expect(count).toBe(2)
	expect(db.create).toHaveBeenCalledTimes(2)
	expect(db.deleteMany).toHaveBeenCalledWith(homeworkCompletionTable, {
		where: { clientId: 'client-1' },
	})
})

test('keeps anonymous homework rows for retry when a non-unique upsert fails', async () => {
	const { db, isUniqueConstraintError, migrateHomeworkCompletionsToUser } =
		await loadMigration()
	const writeError = new Error('write failed')
	db.findMany.mockResolvedValue([
		{
			id: 'row-1',
			seasonNumber: 7,
			episodeNumber: 1,
			itemIndex: 0,
			clientId: 'client-1',
		},
	])
	db.findOne.mockResolvedValue(null)
	db.create.mockRejectedValue(writeError)
	isUniqueConstraintError.mockReturnValue(false)

	await expect(
		migrateHomeworkCompletionsToUser({
			userId: 'user-1',
			clientId: 'client-1',
		}),
	).rejects.toThrow(writeError)
	expect(db.deleteMany).not.toHaveBeenCalled()
})
