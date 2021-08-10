import * as React from 'react'
import {Link} from 'remix'
import type {NonNullProperties, User, Request} from 'types'
import {Team} from '@prisma/client'
import * as dateFns from 'date-fns'
import md5 from 'md5-hash'
import {images} from '../images'
import type {getEnv} from './env.server'

const teams: Array<Team> = Object.values(Team)

const defaultAvatarSize = 128
function getAvatar(
  email: string,
  {
    size = defaultAvatarSize,
    fallback = images.alexProfileGray({resize: {width: size}}),
  }: {size?: number; fallback?: string} = {},
) {
  const hash = md5(email)
  const url = new URL(`https://www.gravatar.com/avatar/${hash}`)
  url.searchParams.set('size', String(size))
  url.searchParams.set('default', fallback)
  return url.toString()
}

const avatarFallbacks: Record<Team, string> = {
  BLUE: images.alexProfileBlue({resize: {width: defaultAvatarSize}}),
  RED: images.alexProfileRed({resize: {width: defaultAvatarSize}}),
  YELLOW: images.alexProfileYellow({resize: {width: defaultAvatarSize}}),
}

function getAvatarForUser(
  {email, team, firstName}: Pick<User, 'email' | 'team' | 'firstName'>,
  fallback: string = avatarFallbacks[team],
) {
  return {
    src: getAvatar(email, {fallback}),
    alt: firstName,
  }
}

type AnchorProps = React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>

const AnchorOrLink = React.forwardRef<HTMLAnchorElement, AnchorProps>(
  function AnchorOrLink(props, ref) {
    const {href = '', ...rest} = props
    if (href.startsWith('http') || href.startsWith('#')) {
      // eslint-disable-next-line jsx-a11y/anchor-has-content
      return <a {...props} ref={ref} />
    } else {
      return <Link to={href} {...rest} ref={ref} />
    }
  },
)

// unfortunately TypeScript doesn't have Intl.ListFormat yet 😢
// so we'll just add it ourselves:
type ListFormatOptions = {
  type?: 'conjunction' | 'disjunction' | 'unit'
  style?: 'long' | 'short' | 'narrow'
  localeMatcher?: 'lookup' | 'best fit'
}
declare namespace Intl {
  class ListFormat {
    constructor(locale: string, options: ListFormatOptions)
    public format: (items: Array<string>) => string
  }
}

type ListifyOptions<ItemType> = {
  type?: ListFormatOptions['type']
  style?: ListFormatOptions['style']
  stringify?: (item: ItemType) => string
}
function listify<ItemType>(
  array: Array<ItemType>,
  {
    type = 'conjunction',
    style = 'long',
    stringify = (thing: {toString(): string}) => thing.toString(),
  }: ListifyOptions<ItemType> = {},
) {
  const stringified = array.map(item => stringify(item))
  const formatter = new Intl.ListFormat('en', {style, type})
  return formatter.format(stringified)
}

function formatTime(seconds: number) {
  return dateFns.format(dateFns.addSeconds(new Date(0), seconds), 'mm:ss')
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return 'Unknown Error'
}

function getErrorStack(error: unknown) {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.stack
  return 'Unknown Error'
}

function getNonNull<Type extends Record<string, null | undefined | unknown>>(
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
): asserts possibleNull is Exclude<PossibleNullType, null | undefined> {
  if (possibleNull == null) throw new Error(errorMessage)
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
  getErrorStack,
  getNonNull,
  assertNonNull,
  listify,
  typedBoolean,
  getRequiredServerEnvVar,
  getRequiredGlobalEnvVar,
  getDiscordAuthorizeURL,
  getDomainUrl,
  teams,
  formatTime,
}
