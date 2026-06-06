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

export { migrateHomeworkCompletionsToUserRecords }
