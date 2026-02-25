import { randomUUID } from 'node:crypto'
import { format } from 'date-fns'
import { data as json, redirect } from 'react-router'
import { type RecordingFormData } from '#app/components/calls/recording-form.tsx'
import {
	deleteAudioObject,
	getAudioBuffer,
	putCallAudioFromBuffer,
	putEpisodeDraftResponseAudioFromBuffer,
	putEpisodeDraftResponseAudioFromDataUrl,
	putCallAudioFromDataUrl,
} from '#app/utils/call-kent-audio-storage.server.ts'
import { enqueueCallKentEpisodeDraftProcessing } from '#app/utils/call-kent-episode-draft-queue.server.ts'
import { startCallKentEpisodeDraftProcessing } from '#app/utils/call-kent-episode-draft.server.ts'
import { getPublishedCallKentEpisodeEmail } from '#app/utils/call-kent-published-email.ts'
import {
	getErrorForAudio,
	getErrorForTitle,
	getErrorForNotes,
} from '#app/utils/call-kent.ts'
import { sendMessageFromDiscordBot } from '#app/utils/discord.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import { markdownToHtml } from '#app/utils/markdown.server.ts'
import {
	getDomainUrl,
	getErrorMessage,
	getOptionalTeam,
	getStringFormValue,
} from '#app/utils/misc.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { sendEmail } from '#app/utils/send-email.server.ts'
import { requireAdminUser, requireUser } from '#app/utils/session.server.ts'
import { teamEmoji } from '#app/utils/team-provider.tsx'
import { createEpisode } from '#app/utils/transistor.server.ts'
import { type Route } from './+types/save'

type ActionData = RecordingFormData
type SubmittedAudio = string | File | null

function getCheckboxFormValue(formData: FormData, key: string) {
	const value = formData.get(key)
	// HTML checkboxes submit the value only when checked (default "on").
	return value === 'on' || value === 'true'
}

function getActionData(formData: FormData) {
	const fields = {
		audio: getAudioFormValue(formData, 'audio'),
		title: getStringFormValue(formData, 'title'),
		notes: getStringFormValue(formData, 'notes'),
	}

	const actionData: ActionData = {
		fields: {
			title: fields.title,
			notes: fields.notes,
		},
		errors: {
			audio: getErrorForAudio(fields.audio),
			title: getErrorForTitle(fields.title),
			notes: getErrorForNotes(fields.notes),
		},
	}

	return { actionData, fields }
}

function getAudioFormValue(formData: FormData, key: string): SubmittedAudio {
	const value = formData.get(key)
	if (typeof value === 'string') return value
	if (value instanceof File) return value
	return null
}

function getAudioContentType(audio: File) {
	return audio.type.trim() ? audio.type : 'audio/webm'
}

function hasActionErrors(actionData: ActionData) {
	return Object.values(actionData.errors).some((error) => error !== null)
}

function redirectCallNotFound() {
	const searchParams = new URLSearchParams()
	searchParams.set('message', 'Call not found')
	return redirect(`/calls/admin?${searchParams.toString()}`)
}

async function createCall({
	request,
	formData,
}: {
	request: Request
	formData: FormData
}) {
	const { actionData, fields } = getActionData(formData)
	if (hasActionErrors(actionData)) {
		return json(actionData, 400)
	}

	const isAnonymous = getCheckboxFormValue(formData, 'anonymous')

	try {
		const user = await requireUser(request)
		const domainUrl = getDomainUrl(request)
		const { audio, title, notes } = fields
		if (!audio || !title) {
			return json(actionData, 400)
		}

		const callId = randomUUID()
		const stored =
			typeof audio === 'string'
				? await putCallAudioFromDataUrl({ callId, dataUrl: audio })
				: await putCallAudioFromBuffer({
						callId,
						audio: new Uint8Array(await audio.arrayBuffer()),
						contentType: getAudioContentType(audio),
					})
		let createdCall: { id: string }
		try {
			createdCall = await prisma.call.create({
				data: {
					id: callId,
					title,
					notes: notes?.trim() || null,
					userId: user.id,
					isAnonymous,
					audioKey: stored.key,
					audioContentType: stored.contentType,
					audioSize: stored.size,
				},
				select: { id: true },
			})
		} catch (error: unknown) {
			// Best-effort cleanup so we don't orphan R2 objects.
			await deleteAudioObject({ key: stored.key }).catch(() => {})
			throw error
		}

		try {
			const env = getEnv()
			const channelId = env.DISCORD_PRIVATE_BOT_CHANNEL
			const adminUserId = env.DISCORD_ADMIN_USER_ID
			const { firstName, team, discordId } = user
			const userMention = discordId ? `<@!${discordId}>` : firstName
			const emoji = teamEmoji[getOptionalTeam(team)]
			const baseMessage = `📳 <@!${adminUserId}> ring ring! New call from ${userMention} ${emoji}: "${title}"${isAnonymous ? ' (anonymous)' : ''}`
			const callAdminUrl = `${domainUrl}/calls/admin/${createdCall.id}`
			const discordMaxLength = 2000
			const notesHeader = `\n\nNotes:\n`
			const trimmedNotes = notes?.trim()

			let message = `${baseMessage}\n\n${callAdminUrl}`
			if (trimmedNotes) {
				// Keep under Discord's hard 2000-character limit by truncating notes.
				const maxNotesLength =
					discordMaxLength -
					(baseMessage.length + notesHeader.length + 2 + callAdminUrl.length) // +2 for "\n\n" before URL
				if (maxNotesLength > 0) {
					const truncatedNotes =
						trimmedNotes.length > maxNotesLength
							? maxNotesLength > 3
								? `${trimmedNotes.slice(0, maxNotesLength - 3)}...`
								: trimmedNotes.slice(0, maxNotesLength)
							: trimmedNotes
					message = `${baseMessage}${notesHeader}${truncatedNotes}\n\n${callAdminUrl}`
				}
			}
			void sendMessageFromDiscordBot(channelId, message)
		} catch (error: unknown) {
			console.error('Problem sending a call message', error)
			// ignore
		}

		return redirect(`/calls/record/${createdCall.id}`)
	} catch (error: unknown) {
		actionData.errors.generalError = getErrorMessage(error)
		return json(actionData, 500)
	}
}

async function publishCall({
	request,
	formData,
}: {
	request: Request
	formData: FormData
}) {
	let publishedTransistorEpisodeId: string | null = null
	try {
		await requireAdminUser(request)
		const callId = getStringFormValue(formData, 'callId')
		if (!callId) return redirectCallNotFound()
		const formCallTitle = getStringFormValue(formData, 'callTitle')
		const formNotes = getStringFormValue(formData, 'notes')

		const call = await prisma.call.findFirst({
			where: { id: callId },
			include: { user: true, episodeDraft: true },
		})
		if (!call) {
			return redirectCallNotFound()
		}

		// Allow overriding call title from the admin UI submit.
		let callTitle = call.title
		if (formCallTitle !== null) {
			const nextTitle = formCallTitle.trim()
			if (!nextTitle) {
				const searchParams = new URLSearchParams()
				searchParams.set('error', 'Call title is required.')
				return redirect(`/calls/admin/${callId}?${searchParams.toString()}`)
			}
			callTitle = nextTitle
			await prisma.call.update({
				where: { id: callId },
				data: { title: callTitle },
			})
		}

		// Allow overriding call notes from the admin UI submit.
		const callNotes =
			formNotes !== null
				? formNotes.trim()
					? formNotes.trim()
					: null
				: call.notes
		if (formNotes !== null) {
			await prisma.call.update({
				where: { id: callId },
				data: { notes: callNotes },
			})
		}

		const draft = call.episodeDraft
		if (!draft || draft.status !== 'READY') {
			const searchParams = new URLSearchParams()
			searchParams.set('error', 'Draft episode is not ready to publish yet.')
			return redirect(`/calls/admin/${callId}?${searchParams.toString()}`)
		}

		// Allow publishing directly from an edit form without requiring a separate
		// "Save" click first.
		const formTitle = getStringFormValue(formData, 'title')
		const formDescription = getStringFormValue(formData, 'description')
		const formKeywords = getStringFormValue(formData, 'keywords')
		const formTranscript = getStringFormValue(formData, 'transcript')
		const shouldUpdateFromForm =
			formTitle !== null ||
			formDescription !== null ||
			formKeywords !== null ||
			formTranscript !== null

		if (shouldUpdateFromForm) {
			const updateData: {
				title?: string
				description?: string
				keywords?: string
				transcript?: string
			} = {}

			const nextTitle = formTitle?.trim()
			const nextDescription = formDescription?.trim()
			const nextKeywords = formKeywords?.trim()
			const nextTranscript = formTranscript?.trim()

			// Only update when a non-empty value is provided; avoids wiping the draft
			// if someone clicks Publish with an empty field.
			if (nextTitle) updateData.title = nextTitle
			if (nextDescription) updateData.description = nextDescription
			if (nextKeywords) updateData.keywords = nextKeywords
			if (nextTranscript) updateData.transcript = nextTranscript

			if (Object.keys(updateData).length) {
				await prisma.callKentEpisodeDraft.update({
					where: { callId },
					data: updateData,
				})
			}
		}

		const title = (formTitle?.trim() || draft.title || '').trim()
		const description = (
			formDescription?.trim() ||
			draft.description ||
			''
		).trim()
		const keywords = (formKeywords?.trim() || draft.keywords || '').trim()
		const transcriptText = (
			formTranscript?.trim() ||
			draft.transcript ||
			''
		).trim()
		const episodeAudioKey = draft.episodeAudioKey

		if (
			!title ||
			!description ||
			!keywords ||
			!transcriptText ||
			!episodeAudioKey
		) {
			const searchParams = new URLSearchParams()
			searchParams.set(
				'error',
				'Draft is missing required fields (audio/transcript/title/description/keywords).',
			)
			return redirect(`/calls/admin/${callId}?${searchParams.toString()}`)
		}

		const episodeAudio = await getAudioBuffer({ key: episodeAudioKey })
		const summaryName = call.isAnonymous ? 'Anonymous' : call.user.firstName
		const published = await createEpisode({
			request,
			audio: episodeAudio,
			title,
			summary: `${summaryName} asked this on ${format(call.createdAt, 'yyyy-MM-dd')}`,
			description: await markdownToHtml(description),
			user: call.user,
			keywords,
			isAnonymous: call.isAnonymous,
			transcriptText,
		})
		publishedTransistorEpisodeId = published.transistorEpisodeId

		if (published.episodeUrl) {
			try {
				const email = getPublishedCallKentEpisodeEmail({
					firstName: call.user.firstName,
					episodeTitle: title,
					episodeUrl: published.episodeUrl,
					imageUrl: published.imageUrl,
				})
				void sendEmail({
					to: call.user.email,
					from: `"Kent C. Dodds" <hello+calls@kentcdodds.com>`,
					subject: `Your "Call Kent" episode has been published`,
					text: email.text,
					html: email.html,
				})
			} catch (error: unknown) {
				console.error(
					`Problem sending email about a call: ${published.episodeUrl}`,
					error,
				)
			}
		}

		// Persist a per-caller record so users can see their episodes on /me even
		// after the raw call record is removed.
		try {
			await prisma.$transaction([
				prisma.callKentCallerEpisode.create({
					data: {
						userId: call.userId,
						callTitle,
						callNotes,
						isAnonymous: call.isAnonymous,
						transistorEpisodeId: published.transistorEpisodeId,
					},
				}),
				prisma.call.delete({ where: { id: call.id } }),
			])
		} catch (error: unknown) {
			console.error(
				'Transistor episode already created but DB cleanup failed.',
				{
					transistorEpisodeId: published.transistorEpisodeId,
					callId: call.id,
				},
				error,
			)
			throw error
		}

		// Best-effort cleanup of stored audio blobs after publish.
		const keysToDelete = [call.audioKey, draft.episodeAudioKey].filter(
			(k): k is string => typeof k === 'string' && k.length > 0,
		)
		await Promise.all(
			keysToDelete.map(async (key) =>
				deleteAudioObject({ key }).catch(() => {}),
			),
		)

		return redirect('/calls')
	} catch (error: unknown) {
		// If createEpisode already ran, log the episode ID for manual cleanup.
		if (publishedTransistorEpisodeId) {
			console.error(
				'Publish failed after Transistor episode creation.',
				{ transistorEpisodeId: publishedTransistorEpisodeId },
				error,
			)
		}
		const callId = getStringFormValue(formData, 'callId')
		const searchParams = new URLSearchParams()
		searchParams.set('error', getErrorMessage(error))
		return redirect(
			callId
				? `/calls/admin/${callId}?${searchParams.toString()}`
				: '/calls/admin',
		)
	}
}

async function createEpisodeDraft({
	request,
	formData,
}: {
	request: Request
	formData: FormData
}) {
	const callId = getStringFormValue(formData, 'callId')
	const responseAudio = getAudioFormValue(formData, 'audio')
	const formCallTitle = getStringFormValue(formData, 'callTitle')
	const formNotes = getStringFormValue(formData, 'notes')
	if (!callId) return redirectCallNotFound()
	if (getErrorForAudio(responseAudio)) {
		const searchParams = new URLSearchParams()
		searchParams.set('error', 'Response audio file is required.')
		return redirect(`/calls/admin/${callId}?${searchParams.toString()}`)
	}

	await requireAdminUser(request)

	const call = await prisma.call.findFirst({ where: { id: callId } })
	if (!call) return redirectCallNotFound()

	// Allow overriding call title from the admin UI submit.
	if (formCallTitle !== null) {
		const nextTitle = formCallTitle.trim()
		if (!nextTitle) {
			const searchParams = new URLSearchParams()
			searchParams.set('error', 'Call title is required.')
			return redirect(`/calls/admin/${callId}?${searchParams.toString()}`)
		}
		await prisma.call.update({
			where: { id: callId },
			data: { title: nextTitle },
		})
	}

	// Allow overriding call notes from the admin UI submit.
	if (formNotes !== null) {
		const nextNotes = formNotes.trim()
		await prisma.call.update({
			where: { id: callId },
			data: { notes: nextNotes ? nextNotes : null },
		})
	}

	// If we're replacing a draft, clean up the old stored audio blob.
	const existingDraft = await prisma.callKentEpisodeDraft.findFirst({
		where: { callId },
		select: { episodeAudioKey: true },
	})
	if (existingDraft?.episodeAudioKey) {
		await deleteAudioObject({ key: existingDraft.episodeAudioKey }).catch(
			() => {},
		)
	}

	// Replace any existing draft so "re-record response" is safe and predictable.
	const [, draft] = await prisma.$transaction([
		prisma.callKentEpisodeDraft.deleteMany({ where: { callId } }),
		prisma.callKentEpisodeDraft.create({
			data: {
				callId,
			},
		}),
	])

	const responseAudioObject =
		typeof responseAudio === 'string'
			? await putEpisodeDraftResponseAudioFromDataUrl({
					draftId: draft.id,
					dataUrl: responseAudio,
				})
			: await putEpisodeDraftResponseAudioFromBuffer({
					draftId: draft.id,
					audio: new Uint8Array(await responseAudio!.arrayBuffer()),
					contentType: getAudioContentType(responseAudio!),
				})
	let wasEnqueued = false
	try {
		wasEnqueued = await enqueueCallKentEpisodeDraftProcessing({
			draftId: draft.id,
			responseAudioKey: responseAudioObject.key,
		})
	} catch (error: unknown) {
		console.error('Failed to enqueue Call Kent draft processing job', {
			draftId: draft.id,
			error: getErrorMessage(error),
		})
	}
	if (!wasEnqueued) {
		void startCallKentEpisodeDraftProcessing(draft.id, {
			responseAudioKey: responseAudioObject.key,
		})
	}

	return redirect(`/calls/admin/${callId}`)
}

async function undoEpisodeDraft({
	request,
	formData,
}: {
	request: Request
	formData: FormData
}) {
	const callId = getStringFormValue(formData, 'callId')
	if (!callId) return redirectCallNotFound()

	await requireAdminUser(request)

	const drafts = await prisma.callKentEpisodeDraft.findMany({
		where: { callId },
		select: { episodeAudioKey: true },
	})
	if (drafts.some((d) => d.episodeAudioKey)) {
		await Promise.all(
			drafts
				.map((d) => d.episodeAudioKey)
				.filter((k): k is string => typeof k === 'string' && k.length > 0)
				.map(async (key) => deleteAudioObject({ key }).catch(() => {})),
		)
	}
	await prisma.callKentEpisodeDraft.deleteMany({ where: { callId } })
	return redirect(`/calls/admin/${callId}`)
}

async function updateEpisodeDraft({
	request,
	formData,
}: {
	request: Request
	formData: FormData
}) {
	const callId = getStringFormValue(formData, 'callId')
	if (!callId) return redirectCallNotFound()

	const callTitle = getStringFormValue(formData, 'callTitle')
	const notes = getStringFormValue(formData, 'notes')
	const title = getStringFormValue(formData, 'title')
	const description = getStringFormValue(formData, 'description')
	const keywords = getStringFormValue(formData, 'keywords')
	const transcript = getStringFormValue(formData, 'transcript')

	await requireAdminUser(request)

	try {
		// Allow overriding call title from the admin UI submit.
		if (callTitle !== null) {
			const nextTitle = callTitle.trim()
			if (!nextTitle) {
				const searchParams = new URLSearchParams()
				searchParams.set('error', 'Call title is required.')
				return redirect(`/calls/admin/${callId}?${searchParams.toString()}`)
			}
			await prisma.call.update({
				where: { id: callId },
				data: { title: nextTitle },
			})
		}

		// Allow overriding call notes from the admin UI submit.
		if (notes !== null) {
			const nextNotes = notes.trim()
			await prisma.call.update({
				where: { id: callId },
				data: { notes: nextNotes ? nextNotes : null },
			})
		}

		const updateData: {
			title?: string
			description?: string
			keywords?: string
			transcript?: string
		} = {}
		const nextTitle = title?.trim()
		const nextDescription = description?.trim()
		const nextKeywords = keywords?.trim()
		const nextTranscript = transcript?.trim()

		if (nextTitle) updateData.title = nextTitle
		if (nextDescription) updateData.description = nextDescription
		if (nextKeywords) updateData.keywords = nextKeywords
		if (nextTranscript) updateData.transcript = nextTranscript

		if (Object.keys(updateData).length) {
			await prisma.callKentEpisodeDraft.update({
				where: { callId },
				data: updateData,
			})
		}
		return redirect(`/calls/admin/${callId}`)
	} catch (error: unknown) {
		const searchParams = new URLSearchParams()
		searchParams.set('error', getErrorMessage(error))
		return redirect(`/calls/admin/${callId}?${searchParams.toString()}`)
	}
}

async function deleteCall({
	request,
	formData,
}: {
	request: Request
	formData: FormData
}) {
	const callId = getStringFormValue(formData, 'callId')
	if (!callId) {
		return redirectCallNotFound()
	}

	await requireAdminUser(request)
	const call = await prisma.call.findFirst({
		where: { id: callId },
		select: {
			id: true,
			audioKey: true,
			episodeDraft: { select: { episodeAudioKey: true } },
		},
	})
	if (!call) {
		return redirectCallNotFound()
	}
	await prisma.call.delete({ where: { id: callId } })

	const keysToDelete = [
		call.audioKey,
		call.episodeDraft?.episodeAudioKey,
	].filter((k): k is string => typeof k === 'string' && k.length > 0)
	if (keysToDelete.length) {
		await Promise.all(
			keysToDelete.map(async (key) =>
				deleteAudioObject({ key }).catch(() => {}),
			),
		)
	}
	return redirect('/calls/admin')
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const intent = getStringFormValue(formData, 'intent')

	if (intent === 'create-call') {
		return createCall({ request, formData })
	}
	if (intent === 'create-episode-draft')
		return createEpisodeDraft({ request, formData })
	if (intent === 'undo-episode-draft')
		return undoEpisodeDraft({ request, formData })
	if (intent === 'update-episode-draft')
		return updateEpisodeDraft({ request, formData })
	if (intent === 'publish-episode-draft')
		return publishCall({ request, formData })
	if (intent === 'delete-call') {
		return deleteCall({ request, formData })
	}

	return json(
		{
			fields: {},
			errors: {
				generalError: 'Unknown recording form intent.',
			},
		} satisfies ActionData,
		400,
	)
}
