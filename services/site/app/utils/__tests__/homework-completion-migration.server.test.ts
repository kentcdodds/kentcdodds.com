import { expect, test, vi } from 'vitest'
import { migrateHomeworkCompletionsToUserRecords } from '../homework-completion-migration.server.ts'

function makeHomeworkCompletionStore() {
	return {
		findMany: vi.fn(),
		upsert: vi.fn(),
		deleteMany: vi.fn(),
	}
}

test('migrates anonymous homework completions sequentially before deleting client rows', async () => {
	const homeworkCompletion = makeHomeworkCompletionStore()
	homeworkCompletion.findMany.mockResolvedValue([
		{ seasonNumber: 7, episodeNumber: 1, itemIndex: 0 },
		{ seasonNumber: 7, episodeNumber: 1, itemIndex: 1 },
	])
	homeworkCompletion.upsert.mockResolvedValue({})
	homeworkCompletion.deleteMany.mockResolvedValue({ count: 2 })

	const count = await migrateHomeworkCompletionsToUserRecords({
		userId: 'user-1',
		clientId: 'client-1',
		homeworkCompletion,
	})

	expect(count).toBe(2)
	expect(homeworkCompletion.findMany).toHaveBeenCalledWith({
		where: { clientId: 'client-1' },
		select: {
			seasonNumber: true,
			episodeNumber: true,
			itemIndex: true,
		},
	})
	expect(homeworkCompletion.upsert).toHaveBeenCalledTimes(2)
	expect(homeworkCompletion.upsert).toHaveBeenNthCalledWith(1, {
		where: {
			userId_seasonNumber_episodeNumber_itemIndex: {
				userId: 'user-1',
				seasonNumber: 7,
				episodeNumber: 1,
				itemIndex: 0,
			},
		},
		create: {
			userId: 'user-1',
			seasonNumber: 7,
			episodeNumber: 1,
			itemIndex: 0,
		},
		update: { updatedAt: expect.any(Date) },
	})
	expect(homeworkCompletion.deleteMany).toHaveBeenCalledWith({
		where: { clientId: 'client-1' },
	})
	expect(
		homeworkCompletion.upsert.mock.invocationCallOrder.at(-1),
	).toBeLessThan(homeworkCompletion.deleteMany.mock.invocationCallOrder[0]!)
})

test('does not delete anonymous homework rows when there is nothing to migrate', async () => {
	const homeworkCompletion = makeHomeworkCompletionStore()
	homeworkCompletion.findMany.mockResolvedValue([])

	const count = await migrateHomeworkCompletionsToUserRecords({
		userId: 'user-1',
		clientId: 'client-1',
		homeworkCompletion,
	})

	expect(count).toBe(0)
	expect(homeworkCompletion.upsert).not.toHaveBeenCalled()
	expect(homeworkCompletion.deleteMany).not.toHaveBeenCalled()
})

test('ignores unique races and still deletes anonymous homework rows after all upserts finish', async () => {
	const homeworkCompletion = makeHomeworkCompletionStore()
	const uniqueError = new Error('unique conflict')
	homeworkCompletion.findMany.mockResolvedValue([
		{ seasonNumber: 7, episodeNumber: 1, itemIndex: 0 },
		{ seasonNumber: 7, episodeNumber: 1, itemIndex: 1 },
	])
	homeworkCompletion.upsert
		.mockRejectedValueOnce(uniqueError)
		.mockResolvedValueOnce({})
	homeworkCompletion.deleteMany.mockResolvedValue({ count: 2 })

	const count = await migrateHomeworkCompletionsToUserRecords({
		userId: 'user-1',
		clientId: 'client-1',
		homeworkCompletion,
		isUniqueConstraintError: (error) => error === uniqueError,
	})

	expect(count).toBe(2)
	expect(homeworkCompletion.upsert).toHaveBeenCalledTimes(2)
	expect(homeworkCompletion.deleteMany).toHaveBeenCalledWith({
		where: { clientId: 'client-1' },
	})
})

test('keeps anonymous homework rows for retry when a non-unique upsert fails', async () => {
	const homeworkCompletion = makeHomeworkCompletionStore()
	const writeError = new Error('write failed')
	homeworkCompletion.findMany.mockResolvedValue([
		{ seasonNumber: 7, episodeNumber: 1, itemIndex: 0 },
	])
	homeworkCompletion.upsert.mockRejectedValue(writeError)

	await expect(
		migrateHomeworkCompletionsToUserRecords({
			userId: 'user-1',
			clientId: 'client-1',
			homeworkCompletion,
		}),
	).rejects.toThrow(writeError)
	expect(homeworkCompletion.deleteMany).not.toHaveBeenCalled()
})
