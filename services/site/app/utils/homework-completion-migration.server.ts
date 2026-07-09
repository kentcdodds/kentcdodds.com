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

async function migrateHomeworkCompletionsToUser({
	userId,
	clientId,
}: {
	userId: string
	clientId: string
}) {
	const completions = await db.findMany(homeworkCompletionTable, {
		where: { clientId },
	})
	if (completions.length === 0) {
		return 0
	}

	for (const completion of completions) {
		try {
			await upsertHomeworkCompletionRecord({
				userId,
				seasonNumber: completion.seasonNumber,
				episodeNumber: completion.episodeNumber,
				itemIndex: completion.itemIndex,
			})
		} catch (error) {
			if (!isUniqueConstraintError(error)) {
				throw error
			}
		}
	}

	await db.deleteMany(homeworkCompletionTable, { where: { clientId } })
	return completions.length
}

export {
	getEpisodeHomeworkCompletions,
	migrateHomeworkCompletionsToUser,
	setEpisodeHomeworkCompletion,
}
