import { type Team, type User } from '#app/types.ts'
import { getEnv } from './env.server.ts'
import { getTeam } from './misc.ts'
import { prisma } from './prisma.server.ts'

function getDiscordConfig() {
	const env = getEnv()
	return {
		clientId: env.DISCORD_CLIENT_ID,
		clientSecret: env.DISCORD_CLIENT_SECRET,
		scopes: env.DISCORD_SCOPES,
		botToken: env.DISCORD_BOT_TOKEN,
		guildId: env.DISCORD_GUILD_ID,
		memberRole: env.DISCORD_MEMBER_ROLE,
		roleByTeam: {
			RED: env.DISCORD_RED_ROLE,
			YELLOW: env.DISCORD_YELLOW_ROLE,
			BLUE: env.DISCORD_BLUE_ROLE,
		} satisfies Record<Team, string>,
	}
}
type DiscordUser = {
	id: string
	username: string
	discriminator: string
	avatar?: string
}
type DiscordMember = { user: DiscordUser; roles: Array<string> }
type DiscordToken = {
	token_type: string
	access_token: string
}
type DiscordError = { message: string; code: number }

async function fetchAsDiscordBot(endpoint: string, config?: RequestInit) {
	const { botToken } = getDiscordConfig()
	const url = new URL(`https://discord.com/api/${endpoint}`)
	const res = await fetch(url.toString(), {
		...config,
		headers: {
			Authorization: `Bot ${botToken}`,
			...config?.headers,
		},
	})
	return res
}

async function fetchJsonAsDiscordBot<JsonType = unknown>(
	endpoint: string,
	config?: RequestInit,
) {
	const res = await fetchAsDiscordBot(endpoint, {
		...config,
		headers: {
			'Content-Type': 'application/json',
			...config?.headers,
		},
	})
	const json = (await res.json()) as JsonType
	return json
}

async function sendMessageFromDiscordBot(channelId: string, content: string) {
	await fetchAsDiscordBot(`channels/${channelId}/messages`, {
		method: 'POST',
		body: JSON.stringify({ content }),
		headers: { 'Content-Type': 'application/json' },
	})
}

async function getUserToken({
	code,
	domainUrl,
}: {
	code: string
	domainUrl: string
}) {
	const { clientId, clientSecret, scopes } = getDiscordConfig()
	const tokenUrl = new URL('https://discord.com/api/oauth2/token')
	const params = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: 'authorization_code',
		code,
		redirect_uri: `${domainUrl}/discord/callback`,
		scope: scopes,
	})

	const tokenRes = await fetch(tokenUrl.toString(), {
		method: 'POST',
		body: params,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	})

	const discordToken = (await tokenRes.json()) as DiscordToken

	const userUrl = new URL('https://discord.com/api/users/@me')
	const userRes = await fetch(userUrl.toString(), {
		headers: {
			authorization: `${discordToken.token_type} ${discordToken.access_token}`,
		},
	})
	const discordUser = (await userRes.json()) as DiscordUser

	return { discordUser, discordToken }
}

async function getDiscordUser(discordUserId: string) {
	const user = await fetchJsonAsDiscordBot<DiscordUser>(
		`users/${discordUserId}`,
	)
	return user
}

async function getMember(discordUserId: string) {
	const { guildId } = getDiscordConfig()
	const member = await fetchJsonAsDiscordBot<DiscordMember | DiscordError>(
		`guilds/${guildId}/members/${discordUserId}`,
	)
	return member
}

async function updateDiscordRolesForUser(
	discordMember: DiscordMember,
	user: User,
) {
	await prisma.user.update({
		where: { id: user.id },
		data: { discordId: discordMember.user.id },
	})

	const team = getTeam(user.team)
	if (!team) {
		return
	}
	const { guildId, memberRole, roleByTeam } = getDiscordConfig()
	const teamRole = roleByTeam[team]

	if (!discordMember.roles.includes(teamRole)) {
		await fetchAsDiscordBot(
			`guilds/${guildId}/members/${discordMember.user.id}`,
			{
				method: 'PATCH',
				body: JSON.stringify({
					roles: Array.from(
						new Set([...discordMember.roles, memberRole, teamRole]),
					),
				}),
				// note using fetchJsonAsDiscordBot because this API doesn't return JSON.
				headers: {
					'Content-Type': 'application/json',
				},
			},
		)
	}
}

async function addUserToDiscordServer(
	discordUser: DiscordUser,
	discordToken: DiscordToken,
) {
	const { guildId } = getDiscordConfig()
	// there's no harm inviting someone who's already in the server,
	// so we invite them without bothering to check whether they're in the
	// server already
	await fetchAsDiscordBot(
		`guilds/${guildId}/members/${discordUser.id}`,
		{
			method: 'PUT',
			body: JSON.stringify({ access_token: discordToken.access_token }),
			headers: { 'Content-Type': 'application/json' },
		},
	)
}

async function connectDiscord({
	user,
	code,
	domainUrl,
}: {
	user: User
	code: string
	domainUrl: string
}) {
	const { discordUser, discordToken } = await getUserToken({ code, domainUrl })

	await addUserToDiscordServer(discordUser, discordToken)

	// give the server bot a little time to handle the new user
	// it's not a disaster if the bot doesn't manage to handle it
	// faster, but it's better if the bot adds the right roles etc
	// before we retrieve the member.
	await new Promise((resolve) => setTimeout(resolve, 300))

	const discordMember = await getMember(discordUser.id)
	if ('user' in discordMember) {
		await updateDiscordRolesForUser(discordMember, user)
	} else if ('message' in discordMember) {
		throw new Error(
			`Discord Error (${discordMember.code}): ${discordMember.message}`,
		)
	}

	return discordMember
}

export { connectDiscord, getDiscordUser, getMember, sendMessageFromDiscordBot }
