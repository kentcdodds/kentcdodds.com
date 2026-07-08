import { db, isUniqueConstraintError } from '#app/utils/db.server.ts'
import { homeworkCompletionTable } from '#app/utils/db/schema.server.ts'
import { getEpisodeHomeworkContentId } from '#app/utils/favorites.ts'

async function upsertHomeworkCompletionRecord({
	userId,
	clientId,
	seasonNumber,
	episodeNumber,
	itemIndex,
}: {
	userId?: string
	clientId?: string
	seasonNumber: number
	episodeNumber: number
	itemIndex: number
}) {
	const where = {
		seasonNumber,
		episodeNumber,
		itemIndex,
		...(userId ? { userId } : { clientId: clientId as string }),
	}
	const existing = await db.findOne(homeworkCompletionTable, { where })
	if (existing) {
		await db.update(homeworkCompletionTable, existing.id, {})
		return existing
	}
	return db.create(homeworkCompletionTable, where, { returnRow: true })
}

async function getEpisodeHomeworkCompletions({
	seasonNumber,
	episodeNumber,
	userId,
	clientId,
}: {
	seasonNumber: number
	episodeNumber: number
} & (
	| { userId: string; clientId?: undefined | null }
	| { userId?: undefined | null; clientId: string }
	| { userId?: undefined | null; clientId?: undefined | null }
)) {
	const ownerWhere = userId ? { userId } : clientId ? { clientId } : null
	if (!ownerWhere) return new Set<string>()
	const completions = await db.findMany(homeworkCompletionTable, {
		where: {
			...ownerWhere,
			seasonNumber,
			episodeNumber,
		},
	})
	return new Set(
		completions.map((completion) =>
			getEpisodeHomeworkContentId({
				seasonNumber,
				episodeNumber,
				itemIndex: completion.itemIndex,
			}),
		),
	)
}

async function setEpisodeHomeworkCompletion({
	seasonNumber,
	episodeNumber,
	itemIndex,
	userId,
	clientId,
	completed,
}: {
	seasonNumber: number
	episodeNumber: number
	itemIndex: number
	completed: boolean
} & (
	| { userId: string; clientId?: undefined | null }
	| { userId?: undefined | null; clientId: string }
)) {
	if (!userId && !clientId) {
		throw new Error('clientId is required when userId is absent')
	}
	const ownerWhere = userId ? { userId } : { clientId: clientId as string }
	const compositeWhere = {
		...ownerWhere,
		seasonNumber,
		episodeNumber,
		itemIndex,
	}

	if (completed) {
		await upsertHomeworkCompletionRecord(compositeWhere)
		return true
	}

	await db.deleteMany(homeworkCompletionTable, { where: compositeWhere })
	return false
}

type HomeworkCompletionToMigrate = {
	seasonNumber: number
	episodeNumber: number
	itemIndex: number
}

type HomeworkCompletionStore = {
	findMany(args: {
		where: { clientId: string }
		select: {
			seasonNumber: true
			episodeNumber: true
			itemIndex: true
		}
	}): Promise<Array<HomeworkCompletionToMigrate>>
	upsert(args: {
		where: {
			userId_seasonNumber_episodeNumber_itemIndex: {
				userId: string
				seasonNumber: number
				episodeNumber: number
				itemIndex: number
			}
		}
		create: {
			userId: string
			seasonNumber: number
			episodeNumber: number
			itemIndex: number
		}
		update: { updatedAt: Date }
	}): Promise<unknown>
	deleteMany(args: { where: { clientId: string } }): Promise<unknown>
}

async function migrateHomeworkCompletionsToUserRecords({
	userId,
	clientId,
	homeworkCompletion,
	isUniqueConstraintError = () => false,
}: {
	userId: string
	clientId: string
	homeworkCompletion: HomeworkCompletionStore
	isUniqueConstraintError?: (error: unknown) => boolean
}) {
	const completions = await homeworkCompletion.findMany({
		where: { clientId },
		select: {
			seasonNumber: true,
			episodeNumber: true,
			itemIndex: true,
		},
	})
	if (completions.length === 0) {
		return 0
	}

	for (const completion of completions) {
		try {
			await homeworkCompletion.upsert({
				where: {
					userId_seasonNumber_episodeNumber_itemIndex: {
						userId,
						seasonNumber: completion.seasonNumber,
						episodeNumber: completion.episodeNumber,
						itemIndex: completion.itemIndex,
					},
				},
				create: {
					userId,
					seasonNumber: completion.seasonNumber,
					episodeNumber: completion.episodeNumber,
					itemIndex: completion.itemIndex,
				},
				update: {
					updatedAt: new Date(),
				},
			})
		} catch (error) {
			if (!isUniqueConstraintError(error)) {
				throw error
			}
		}
	}

	await homeworkCompletion.deleteMany({ where: { clientId } })
	return completions.length
}

function createHomeworkCompletionStore(): HomeworkCompletionStore {
	return {
		findMany: async ({ where }) => {
			const rows = await db.findMany(homeworkCompletionTable, { where })
			return rows.map((row) => ({
				seasonNumber: row.seasonNumber,
				episodeNumber: row.episodeNumber,
				itemIndex: row.itemIndex,
			}))
		},
		upsert: async ({ where, create }) => {
			const composite = where.userId_seasonNumber_episodeNumber_itemIndex
			try {
				await upsertHomeworkCompletionRecord({
					userId: composite.userId,
					seasonNumber: create.seasonNumber,
					episodeNumber: create.episodeNumber,
					itemIndex: create.itemIndex,
				})
			} catch (error) {
				if (!isUniqueConstraintError(error)) {
					throw error
				}
			}
		},
		deleteMany: async ({ where }) => {
			await db.deleteMany(homeworkCompletionTable, { where })
		},
	}
}

async function migrateHomeworkCompletionsToUser({
	userId,
	clientId,
}: {
	userId: string
	clientId: string
}) {
	return migrateHomeworkCompletionsToUserRecords({
		userId,
		clientId,
		homeworkCompletion: createHomeworkCompletionStore(),
		isUniqueConstraintError,
	})
}

export {
	createHomeworkCompletionStore,
	getEpisodeHomeworkCompletions,
	migrateHomeworkCompletionsToUser,
	migrateHomeworkCompletionsToUserRecords,
	setEpisodeHomeworkCompletion,
}
