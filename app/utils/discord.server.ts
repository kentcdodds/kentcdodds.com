import type {User, Team} from 'types'
import {prisma} from './prisma.server'
import {getRequiredServerEnvVar} from './misc'

const DISCORD_CLIENT_ID = getRequiredServerEnvVar('DISCORD_CLIENT_ID')
const DISCORD_CLIENT_SECRET = getRequiredServerEnvVar('DISCORD_CLIENT_SECRET')
const DISCORD_REDIRECT_URI = getRequiredServerEnvVar('DISCORD_REDIRECT_URI')
const DISCORD_SCOPES = getRequiredServerEnvVar('DISCORD_SCOPES')
const DISCORD_BOT_TOKEN = getRequiredServerEnvVar('DISCORD_BOT_TOKEN')
const DISCORD_GUILD_ID = getRequiredServerEnvVar('DISCORD_GUILD_ID')
const DISCORD_RED_ROLE = getRequiredServerEnvVar('DISCORD_RED_ROLE')
const DISCORD_YELLOW_ROLE = getRequiredServerEnvVar('DISCORD_YELLOW_ROLE')
const DISCORD_BLUE_ROLE = getRequiredServerEnvVar('DISCORD_BLUE_ROLE')

const discordRoleTeams: {
  [Key in Team]: string
} = {
  RED: DISCORD_RED_ROLE,
  YELLOW: DISCORD_YELLOW_ROLE,
  BLUE: DISCORD_BLUE_ROLE,
}
type DiscordUser = {id: string; username: string}
type DiscordMember = {user: DiscordUser; roles: Array<string>}
type DiscordToken = {
  token_type: string
  access_token: string
}

async function fetchAsDiscordBot<JsonType = unknown>(
  endpoint: string,
  config?: RequestInit,
) {
  const url = new URL(`https://discord.com/api/${endpoint}`)
  const res = await fetch(url.toString(), {
    ...config,
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      ...config?.headers,
    },
  })
  const json = await res.json()
  return json as JsonType
}

async function loadDiscordUser(code: string) {
  const tokenUrl = new URL('https://discord.com/api/oauth2/token')
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: DISCORD_REDIRECT_URI,
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
  // log(`got the discord user. It's ${discordUser.id}, ${discordUser.username}`)
  const discordUser = (await userRes.json()) as DiscordUser

  return {discordUser, discordToken}
}

async function updateDiscordRolesForUser(
  discordMember: DiscordMember,
  user: User,
) {
  await prisma.user.update({
    where: {id: user.id},
    data: {discordId: discordMember.user.id},
  })

  const teamRole = discordRoleTeams[user.team]

  if (!discordMember.roles.includes(teamRole)) {
    await fetchAsDiscordBot(
      `guilds/${DISCORD_GUILD_ID}/members/${discordMember.user.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          roles: Array.from(new Set([...discordMember.roles, teamRole])),
        }),
        headers: {'Content-Type': 'application/json'},
      },
    )
  }
}

async function fetchOrInviteDiscordMember(
  discordUser: DiscordUser,
  discordToken: DiscordToken,
) {
  const memberEndpoint = `guilds/${DISCORD_GUILD_ID}/members/${discordUser.id}`
  // there's no harm inviting someone who's already in the server,
  // so we invite them without bothering to check whether they're in the
  // server already
  await fetchAsDiscordBot(memberEndpoint, {
    method: 'PUT',
    body: JSON.stringify({
      access_token: discordToken.access_token,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const discordMember = await fetchAsDiscordBot<DiscordMember>(memberEndpoint)

  return discordMember
}

async function connectDiscord(user: User, code: string) {
  const {discordUser, discordToken} = await loadDiscordUser(code)

  const discordMember = await fetchOrInviteDiscordMember(
    discordUser,
    discordToken,
  )

  await updateDiscordRolesForUser(discordMember, user)

  return discordMember
}

export {connectDiscord}
