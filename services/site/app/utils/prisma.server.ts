import { remember } from '@epic-web/remember'
import { lt } from '@remix-run/data-table'
import chalk from 'chalk'
import pProps from 'p-props'
import { type Session, type User } from '#app/types.ts'
import { db, isUniqueConstraintError } from '#app/utils/db.server.ts'
import {
	callKentCallerEpisodeTable,
	callTable,
	favoriteTable,
	postReadTable,
	sessionTable,
	userTable,
	verificationTable,
} from '#app/utils/db/schema.server.ts'
import {
	getEpisodeHomeworkCompletions,
	migrateHomeworkCompletionsToUser,
	setEpisodeHomeworkCompletion,
} from './homework-completion-migration.server.ts'
import { getPrismaAdapter } from './prisma-adapter.server.ts'
import {
	createPrismaRpcClient,
	getPrismaRpcBinding,
} from './prisma-rpc-client.server.ts'
import { PrismaClient } from './prisma-generated.server/client.ts'
import { time, type Timings } from './timing.server.ts'

const logThreshold = 500

function getPrismaClient(): PrismaClient {
	return remember('prisma', getClient)
}

const prisma = new Proxy({} as PrismaClient, {
	get(_target, prop, receiver) {
		const client = getPrismaClient() as object
		const value = Reflect.get(client, prop, receiver)
		return typeof value === 'function' ? value.bind(client) : value
	},
})

function getClient(): PrismaClient {
	const rpc = getPrismaRpcBinding()
	if (rpc) {
		return createPrismaRpcClient(rpc)
	}
	const client = new PrismaClient({
		adapter: getPrismaAdapter(),
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
	void client.$connect()
	return client
}

const sessionExpirationTime = 1000 * 60 * 60 * 24 * 365

async function createSession(
	sessionData: Omit<Session, 'id' | 'expirationDate' | 'createdAt'>,
) {
	return db.create(
		sessionTable,
		{
			...sessionData,
			expirationDate: new Date(Date.now() + sessionExpirationTime),
		},
		{ returnRow: true },
	)
}

async function deleteExpiredSessions({
	now = new Date(),
}: { now?: Date } = {}) {
	const result = await db.deleteMany(sessionTable, {
		where: lt('expirationDate', now),
	})
	return result.affectedRows
}

async function deleteExpiredVerifications({
	now = new Date(),
}: { now?: Date } = {}) {
	const result = await db.deleteMany(verificationTable, {
		where: lt('expiresAt', now),
	})
	return result.affectedRows
}

const inflightSessionUsers = new Map<
	string,
	Promise<Awaited<ReturnType<typeof resolveUserFromSessionId>>>
>()

async function resolveUserFromSessionId(
	sessionId: string,
	{ timings }: { timings?: Timings } = {},
) {
	const session = await time(db.find(sessionTable, sessionId), {
		timings,
		type: 'getUserFromSessionId',
	})
	if (!session) {
		throw new Error('No user found')
	}

	const expirationDate =
		session.expirationDate instanceof Date
			? session.expirationDate
			: new Date(session.expirationDate as string)

	if (Date.now() > expirationDate.getTime()) {
		await db.delete(sessionTable, sessionId)
		throw new Error('Session expired. Please log in again.')
	}

	const twoWeeks = 1000 * 60 * 60 * 24 * 30 * 6
	if (Date.now() + twoWeeks > expirationDate.getTime()) {
		const newExpirationDate = new Date(Date.now() + sessionExpirationTime)
		await db.update(sessionTable, sessionId, {
			expirationDate: newExpirationDate,
		})
	}

	const user = await time(db.find(userTable, session.userId), {
		timings,
		type: 'getUserFromSessionId:user',
	})
	if (!user) {
		throw new Error('No user found')
	}

	return user as User
}

async function getUserFromSessionId(
	sessionId: string,
	options: { timings?: Timings } = {},
) {
	const inflight = inflightSessionUsers.get(sessionId)
	if (inflight) return inflight

	const promise = resolveUserFromSessionId(sessionId, options).finally(() => {
		inflightSessionUsers.delete(sessionId)
	})
	inflightSessionUsers.set(sessionId, promise)
	return promise
}

async function getAllUserData(userId: string) {
	return pProps({
		user: db.find(userTable, userId),
		calls: db.findMany(callTable, {
			where: { userId },
		}),
		callKentCallerEpisodes: db.findMany(callKentCallerEpisodeTable, {
			where: { userId },
		}),
		favorites: db.findMany(favoriteTable, {
			where: { userId },
		}),
		postReads: db.findMany(postReadTable, {
			where: { userId },
		}),
		sessions: db.findMany(sessionTable, {
			where: { userId },
		}),
	})
}

export {
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
