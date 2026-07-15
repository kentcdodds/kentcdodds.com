import { query } from '@remix-run/data-table'
import { db } from './db.server.ts'
import {
	callKentCallerEpisodeTable,
	callKentEpisodeDraftTable,
	callTable,
	passwordTable,
	sessionTable,
} from './db/schema.server.ts'

async function recordPublishedCallKentEpisode({
	userId,
	callId,
	callTitle,
	callNotes,
	isAnonymous,
	transistorEpisodeId,
}: {
	userId: string
	callId: string
	callTitle: string
	callNotes: string | null
	isAnonymous: boolean
	transistorEpisodeId: string
}) {
	await db.exec(
		query(callKentCallerEpisodeTable).upsert(
			{
				userId,
				callTitle,
				callNotes,
				isAnonymous,
				transistorEpisodeId,
			},
			{
				conflictTarget: ['transistorEpisodeId'],
				update: {
					userId,
					callTitle,
					callNotes,
					isAnonymous,
				},
			},
		),
	)
	await db.deleteMany(callTable, { where: { id: callId } })
}

async function replaceCallKentEpisodeDraft({
	callId,
	processingJobId,
}: {
	callId: string
	processingJobId: string
}) {
	await db.deleteMany(callKentEpisodeDraftTable, { where: { callId } })
	return db.create(
		callKentEpisodeDraftTable,
		{ callId, processingJobId },
		{ returnRow: true },
	)
}

async function upsertPasswordAndDeleteSessions({
	userId,
	passwordHash,
}: {
	userId: string
	passwordHash: string
}) {
	await db.exec(
		query(passwordTable).upsert(
			{ userId, hash: passwordHash },
			{
				conflictTarget: ['userId'],
				update: { hash: passwordHash },
				touch: true,
			},
		),
	)
	try {
		await db.deleteMany(sessionTable, { where: { userId } })
	} catch {
		await db.deleteMany(sessionTable, { where: { userId } })
	}
}

export {
	recordPublishedCallKentEpisode,
	replaceCallKentEpisodeDraft,
	upsertPasswordAndDeleteSessions,
}
