import * as React from 'react'
import {Link} from 'remix'
import type {NonNullProperties, User, Request} from 'types'
import {Team} from '@prisma/client'
import md5 from 'md5-hash'
import {images} from '../images'
import type {getEnv} from './env.server'

const teams: Array<Team> = Object.values(Team)

function getAvatar(
  email: string,
  {
    size = 128,
    fallback = images.alexProfileGray.src,
  }: {size?: number; fallback?: string} = {},
) {
  const hash = md5(email)
  const url = new URL(`https://www.gravatar.com/avatar/${hash}`)
  url.searchParams.set('size', String(size))
  url.searchParams.set('default', fallback)
  return url.toString()
}

const avatarFallbacks: Record<Team, string> = {
  BLUE: images.alexProfileBlue.src,
  RED: images.alexProfileRed.src,
  YELLOW: images.alexProfileYellow.src,
}

function getAvatarForUser({
  email,
  team,
  firstName,
}: Pick<User, 'email' | 'team' | 'firstName'>) {
  return {
    src: getAvatar(email, {fallback: avatarFallbacks[team]}),
    alt: firstName,
  }
}

type AnchorProps = React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>

function AnchorOrLink(props: AnchorProps) {
  const {href = '', ...rest} = props
  if (href.startsWith('http')) {
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    return <a {...props} />
  } else {
    // @ts-expect-error I'm not sure what to do about extra props other than to forward them
    return <Link to={href} {...rest} />
  }
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return 'Unknown Error'
}

function getNonNull<Type extends Record<string, null | unknown>>(
  obj: Type,
): NonNullProperties<Type> {
  for (const [key, val] of Object.entries(obj)) {
    assertNonNull(val, `The value of ${key} is null but it should not be.`)
  }
  return obj as NonNullProperties<Type>
}

function typedBoolean<T>(
  value: T,
): value is Exclude<T, '' | 0 | false | null | undefined> {
  return Boolean(value)
}

function assertNonNull<PossibleNullType>(
  possibleNull: PossibleNullType,
  errorMessage: string,
): asserts possibleNull is Exclude<PossibleNullType, null> {
  if (possibleNull === null) throw new Error(errorMessage)
}

function getRequiredEnvVarFromObj(
  obj: Record<string, string | undefined>,
  key: string,
  devValue: string = `${key}-dev-value`,
) {
  let value = devValue
  const envVal = obj[key]
  if (envVal) {
    value = envVal
  } else if (obj.NODE_ENV === 'production') {
    throw new Error(`${key} is a required env variable`)
  }
  return value
}

function getRequiredServerEnvVar(key: string, devValue?: string) {
  return getRequiredEnvVarFromObj(process.env, key, devValue)
}

function getRequiredGlobalEnvVar(
  key: keyof ReturnType<typeof getEnv>,
  devValue?: string,
) {
  return getRequiredEnvVarFromObj(ENV, key, devValue)
}

function getDiscordAuthorizeURL(domainUrl: string) {
  const url = new URL('https://discord.com/api/oauth2/authorize')
  url.searchParams.set(
    'client_id',
    getRequiredGlobalEnvVar('DISCORD_CLIENT_ID'),
  )
  url.searchParams.set('redirect_uri', `${domainUrl}/discord/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'identify guilds.join email guilds')
  return url.toString()
}

function getDomainUrl(request: Request) {
  const host =
    request.headers.get('X-Forwarded-Host') ?? request.headers.get('host')
  if (!host) {
    throw new Error('Could not determine domain URL.')
  }
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

export {
  getAvatar,
  getAvatarForUser,
  AnchorOrLink,
  getErrorMessage,
  getNonNull,
  assertNonNull,
  typedBoolean,
  getRequiredServerEnvVar,
  getRequiredGlobalEnvVar,
  getDiscordAuthorizeURL,
  getDomainUrl,
  teams,
}
