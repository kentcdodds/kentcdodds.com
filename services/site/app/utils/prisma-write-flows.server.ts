import { prisma } from './prisma.server.ts'

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
	await prisma.callKentCallerEpisode.upsert({
		where: { transistorEpisodeId },
		create: {
			userId,
			callTitle,
			callNotes,
			isAnonymous,
			transistorEpisodeId,
		},
		update: {
			userId,
			callTitle,
			callNotes,
			isAnonymous,
		},
	})
	await prisma.call.deleteMany({ where: { id: callId } })
}

async function replaceCallKentEpisodeDraft({ callId }: { callId: string }) {
	await prisma.callKentEpisodeDraft.deleteMany({ where: { callId } })
	return prisma.callKentEpisodeDraft.create({
		data: {
			callId,
		},
	})
}

async function upsertPasswordAndDeleteSessions({
	userId,
	passwordHash,
}: {
	userId: string
	passwordHash: string
}) {
	await prisma.password.upsert({
		where: { userId },
		update: { hash: passwordHash },
		create: { userId, hash: passwordHash },
	})
	try {
		await prisma.session.deleteMany({ where: { userId } })
	} catch {
		await prisma.session.deleteMany({ where: { userId } })
	}
}

export {
	recordPublishedCallKentEpisode,
	replaceCallKentEpisodeDraft,
	upsertPasswordAndDeleteSessions,
}
