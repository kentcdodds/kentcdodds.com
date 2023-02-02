import type {User, Team} from '~/types'
import {prisma} from './prisma.server'
import {getRequiredServerEnvVar, getTeam} from './misc'

const DISCORD_CLIENT_ID = getRequiredServerEnvVar('DISCORD_CLIENT_ID')
const DISCORD_CLIENT_SECRET = getRequiredServerEnvVar('DISCORD_CLIENT_SECRET')
const DISCORD_SCOPES = getRequiredServerEnvVar('DISCORD_SCOPES')
const DISCORD_BOT_TOKEN = getRequiredServerEnvVar('DISCORD_BOT_TOKEN')
const DISCORD_GUILD_ID = getRequiredServerEnvVar('DISCORD_GUILD_ID')
const DISCORD_RED_ROLE = getRequiredServerEnvVar('DISCORD_RED_ROLE')
const DISCORD_YELLOW_ROLE = getRequiredServerEnvVar('DISCORD_YELLOW_ROLE')
const DISCORD_BLUE_ROLE = getRequiredServerEnvVar('DISCORD_BLUE_ROLE')
const DISCORD_MEMBER_ROLE = getRequiredServerEnvVar('DISCORD_MEMBER_ROLE')

const discordRoleTeams: {
  [Key in Team]: string
} = {
  RED: DISCORD_RED_ROLE,
  YELLOW: DISCORD_YELLOW_ROLE,
  BLUE: DISCORD_BLUE_ROLE,
}
type DiscordUser = {
  id: string
  username: string
  discriminator: string
  avatar?: string
}
type DiscordMember = {user: DiscordUser; roles: Array<string>}
type DiscordToken = {
  token_type: string
  access_token: string
}
type DiscordError = {message: string; code: number}

async function fetchAsDiscordBot(endpoint: string, config?: RequestInit) {
  const url = new URL(`https://discord.com/api/${endpoint}`)
  const res = await fetch(url.toString(), {
    ...config,
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
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
    body: JSON.stringify({content}),
    headers: {'Content-Type': 'application/json'},
  })
}

async function getUserToken({
  code,
  domainUrl,
}: {
  code: string
  domainUrl: string
}) {
  const tokenUrl = new URL('https://discord.com/api/oauth2/token')
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${domainUrl}/discord/callback`,
    scope: DISCORD_SCOPES,
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

  return {discordUser, discordToken}
}

async function getDiscordUser(discordUserId: string) {
  const user = await fetchJsonAsDiscordBot<DiscordUser>(
    `users/${discordUserId}`,
  )
  return user
}

async function getMember(discordUserId: string) {
  const member = await fetchJsonAsDiscordBot<DiscordMember | DiscordError>(
    `guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`,
  )
  return member
}

async function updateDiscordRolesForUser(
  discordMember: DiscordMember,
  user: User,
) {
  await prisma.user.update({
    where: {id: user.id},
    data: {discordId: discordMember.user.id},
  })

  const team = getTeam(user.team)
  if (!team) {
    return
  }
  const teamRole = discordRoleTeams[team]

  if (!discordMember.roles.includes(teamRole)) {
    await fetchAsDiscordBot(
      `guilds/${DISCORD_GUILD_ID}/members/${discordMember.user.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          roles: Array.from(
            new Set([...discordMember.roles, DISCORD_MEMBER_ROLE, teamRole]),
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
  // there's no harm inviting someone who's already in the server,
  // so we invite them without bothering to check whether they're in the
  // server already
  await fetchAsDiscordBot(
    `guilds/${DISCORD_GUILD_ID}/members/${discordUser.id}`,
    {
      method: 'PUT',
      body: JSON.stringify({access_token: discordToken.access_token}),
      headers: {'Content-Type': 'application/json'},
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
  const {discordUser, discordToken} = await getUserToken({code, domainUrl})

  await addUserToDiscordServer(discordUser, discordToken)

  // give the server bot a little time to handle the new user
  // it's not a disaster if the bot doesn't manage to handle it
  // faster, but it's better if the bot adds the right roles etc
  // before we retrieve the member.
  await new Promise(resolve => setTimeout(resolve, 300))

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

export {connectDiscord, getDiscordUser, getMember, sendMessageFromDiscordBot}
