import { remember } from '@epic-web/remember'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import chalk from 'chalk'
import pProps from 'p-props'
import { type Session } from '#app/types.ts'
import { getEnv } from '#app/utils/env.server.ts'
import { getEpisodeHomeworkContentId } from '#app/utils/favorites.ts'
import { ensurePrimary } from '#app/utils/litefs-js.server.ts'
import { Prisma, PrismaClient } from './prisma-generated.server/client.ts'
import { time, type Timings } from './timing.server.ts'

const logThreshold = 500

const prisma = remember('prisma', getClient)

function getClient(): PrismaClient {
	// NOTE: during development if you change anything in this function, remember
	// that this only runs once per server restart and won't automatically be
	// re-run per request like everything else is.
	const url = getEnv().DATABASE_URL
	const client = new PrismaClient({
		adapter: new PrismaBetterSqlite3({ url }),
		log: [
			{ level: 'query', emit: 'event' },
			{ level: 'error', emit: 'stdout' },
			{ level: 'info', emit: 'stdout' },
			{ level: 'warn', emit: 'stdout' },
		],
	})
	client.$on('query', async (e) => {
		if (e.duration < logThreshold) return
		const color =
			e.duration < logThreshold * 1.1
				? 'green'
				: e.duration < logThreshold * 1.2
					? 'blue'
					: e.duration < logThreshold * 1.3
						? 'yellow'
						: e.duration < logThreshold * 1.4
							? 'redBright'
							: 'red'
		const dur = chalk[color](`${e.duration}ms`)
		console.info(`prisma:query - ${dur} - ${e.query}`)
	})
	// make the connection eagerly so the first request doesn't have to wait
	void client.$connect()
	return client
}

const sessionExpirationTime = 1000 * 60 * 60 * 24 * 365

async function createSession(
	sessionData: Omit<Session, 'id' | 'expirationDate' | 'createdAt'>,
) {
	await ensurePrimary()
	return prisma.session.create({
		data: {
			...sessionData,
			expirationDate: new Date(Date.now() + sessionExpirationTime),
		},
	})
}

async function deleteExpiredSessions({
	now = new Date(),
}: { now?: Date } = {}) {
	await ensurePrimary()
	const result = await prisma.session.deleteMany({
		where: { expirationDate: { lt: now } },
	})
	return result.count
}

async function deleteExpiredVerifications({
	now = new Date(),
}: { now?: Date } = {}) {
	await ensurePrimary()
	const result = await prisma.verification.deleteMany({
		where: { expiresAt: { lt: now } },
	})
	return result.count
}

async function getUserFromSessionId(
	sessionId: string,
	{ timings }: { timings?: Timings } = {},
) {
	const session = await time(
		prisma.session.findUnique({
			where: { id: sessionId },
			include: { user: true },
		}),
		{ timings, type: 'getUserFromSessionId' },
	)
	if (!session) {
		throw new Error('No user found')
	}

	if (Date.now() > session.expirationDate.getTime()) {
		await ensurePrimary()
		await prisma.session.delete({ where: { id: sessionId } })
		throw new Error('Session expired. Please log in again.')
	}

	// if there's less than ~six months left, extend the session
	const twoWeeks = 1000 * 60 * 60 * 24 * 30 * 6
	if (Date.now() + twoWeeks > session.expirationDate.getTime()) {
		await ensurePrimary()
		const newExpirationDate = new Date(Date.now() + sessionExpirationTime)
		await prisma.session.update({
			data: { expirationDate: newExpirationDate },
			where: { id: sessionId },
		})
	}

	return session.user
}

async function getAllUserData(userId: string) {
	return pProps({
		user: prisma.user.findUnique({ where: { id: userId } }),
		calls: prisma.call.findMany({ where: { userId } }),
		callKentCallerEpisodes: prisma.callKentCallerEpisode.findMany({
			where: { userId },
		}),
		favorites: prisma.favorite.findMany({ where: { userId } }),
		postReads: prisma.postRead.findMany({ where: { userId } }),
		sessions: prisma.session.findMany({ where: { userId } }),
	})
}

async function addPostRead({
	slug,
	userId,
	clientId,
}: { slug: string } & (
	| { userId: string; clientId?: undefined }
	| { userId?: undefined; clientId: string }
)) {
	const id = userId ? { userId } : { clientId }
	const readInLastWeek = await prisma.postRead.findFirst({
		select: { id: true },
		where: {
			...id,
			postSlug: slug,
			createdAt: { gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
		},
	})
	if (readInLastWeek) {
		return null
	} else {
		const postRead = await prisma.postRead.create({
			data: { postSlug: slug, ...id },
			select: { id: true },
		})
		return postRead
	}
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
	const completions = await prisma.homeworkCompletion.findMany({
		where: {
			...ownerWhere,
			seasonNumber,
			episodeNumber,
		},
		select: { itemIndex: true },
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
	if (userId) {
		if (completed) {
			await prisma.homeworkCompletion.upsert({
				where: {
					userId_seasonNumber_episodeNumber_itemIndex: {
						userId,
						seasonNumber,
						episodeNumber,
						itemIndex,
					},
				},
				create: {
					userId,
					seasonNumber,
					episodeNumber,
					itemIndex,
				},
				update: {
					updatedAt: new Date(),
				},
			})
			return true
		}

		await prisma.homeworkCompletion.deleteMany({
			where: {
				userId,
				seasonNumber,
				episodeNumber,
				itemIndex,
			},
		})
		return false
	}

	const anonymousClientId = clientId
	if (!anonymousClientId) {
		throw new Error('clientId is required when userId is absent')
	}

	if (completed) {
		await prisma.homeworkCompletion.upsert({
			where: {
				clientId_seasonNumber_episodeNumber_itemIndex: {
					clientId: anonymousClientId,
					seasonNumber,
					episodeNumber,
					itemIndex,
				},
			},
			create: {
				clientId: anonymousClientId,
				seasonNumber,
				episodeNumber,
				itemIndex,
			},
			update: {
				updatedAt: new Date(),
			},
		})
		return true
	}

	await prisma.homeworkCompletion.deleteMany({
		where: {
			clientId: anonymousClientId,
			seasonNumber,
			episodeNumber,
			itemIndex,
		},
	})
	return false
}

async function migrateHomeworkCompletionsToUser({
	userId,
	clientId,
}: {
	userId: string
	clientId: string
}) {
	const completions = await prisma.homeworkCompletion.findMany({
		where: { clientId },
		select: {
			id: true,
			seasonNumber: true,
			episodeNumber: true,
			itemIndex: true,
		},
	})
	if (completions.length === 0) return 0

	await prisma.$transaction(async (tx) => {
		for (const completion of completions) {
			try {
				await tx.homeworkCompletion.upsert({
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
				if (
					!(error instanceof Prisma.PrismaClientKnownRequestError) ||
					error.code !== 'P2002'
				) {
					throw error
				}
			}
		}

		await tx.homeworkCompletion.deleteMany({ where: { clientId } })
	})

	return completions.length
}

export {
	addPostRead,
	createSession,
	deleteExpiredSessions,
	deleteExpiredVerifications,
	getAllUserData,
	getEpisodeHomeworkCompletions,
	getUserFromSessionId,
	migrateHomeworkCompletionsToUser,
	prisma,
	setEpisodeHomeworkCompletion,
	sessionExpirationTime,
}
