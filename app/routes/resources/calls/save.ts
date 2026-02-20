import { data as json, redirect } from 'react-router'
import { type RecordingFormData } from '#app/components/calls/submit-recording-form.tsx'
import {
	getErrorForAudio,
	getErrorForDescription,
	getErrorForKeywords,
	getErrorForTitle,
} from '#app/utils/call-kent.ts'
import { sendMessageFromDiscordBot } from '#app/utils/discord.server.ts'
import {
	getDomainUrl,
	getErrorMessage,
	getNonNull,
	getOptionalTeam,
	getRequiredServerEnvVar,
} from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { requireUser } from '#app/utils/session.server.ts'
import { teamEmoji } from '#app/utils/team-provider.tsx'
import  { type Route } from './+types/save'

type ActionData = RecordingFormData

export async function action({ request }: Route.ActionArgs) {
	const user = await requireUser(request)
	const actionData: ActionData = { fields: {}, errors: {} }
	const domainUrl = getDomainUrl(request)
	try {
		const requestText = await request.text()
		const form = new URLSearchParams(requestText)

		const formData = {
			audio: form.get('audio'),
			title: form.get('title'),
			description: form.get('description'),
			keywords: form.get('keywords'),
		}
		actionData.fields = {
			title: formData.title,
			description: formData.description,
			keywords: formData.keywords,
		}

		actionData.errors = {
			audio: getErrorForAudio(formData.audio),
			title: getErrorForTitle(formData.title),
			description: getErrorForDescription(formData.description),
			keywords: getErrorForKeywords(formData.keywords),
		}

		if (Object.values(actionData.errors).some((err) => err !== null)) {
			return json(actionData, 401)
		}

		const { audio, title, description, keywords } = getNonNull(formData)
		const call = {
			title,
			description,
			keywords,
			userId: user.id,
			base64: audio,
		}
		const createdCall = await prisma.call.create({ data: call })

		try {
			const channelId = getRequiredServerEnvVar('DISCORD_PRIVATE_BOT_CHANNEL')
			const adminUserId = getRequiredServerEnvVar('DISCORD_ADMIN_USER_ID')
			const { firstName, team, discordId } = user
			const userMention = discordId ? `<@!${discordId}>` : firstName
			const emoji = teamEmoji[getOptionalTeam(team)]
			const message = `📳 <@!${adminUserId}> ring ring! New call from ${userMention} ${emoji}: "${title}"\n\n${description}\n\n${domainUrl}/calls/admin/${createdCall.id}`
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
