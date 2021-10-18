import * as React from 'react'
import type {HeadersFunction} from 'remix'
import {Link} from 'remix'
import type {NonNullProperties, User} from '~/types'
import {Team} from '@prisma/client'
import * as dateFns from 'date-fns'
import md5 from 'md5-hash'
import {images} from '../images'
import type {getEnv} from './env.server'

const teams: Array<Team> = Object.values(Team)
const unknownTeam = {UNKNOWN: 'UNKNOWN'} as const
const optionalTeams = {...Team, ...unknownTeam}
type OptionalTeam = typeof optionalTeams[keyof typeof optionalTeams]

const defaultAvatarSize = 128
function getAvatar(
  email: string,
  {
    size = defaultAvatarSize,
    fallback = images.kodyProfileWhite({resize: {width: size}}),
  }: {size?: number; fallback?: string | null} = {},
) {
  const hash = md5(email)
  const url = new URL(`https://www.gravatar.com/avatar/${hash}`)
  url.searchParams.set('size', String(size))
  if (fallback) url.searchParams.set('default', fallback)
  return url.toString()
}

const avatarFallbacks: Record<Team, (width: number) => string> = {
  BLUE: (width: number) => images.kodyProfileBlue({resize: {width}}),
  RED: (width: number) => images.kodyProfileRed({resize: {width}}),
  YELLOW: (width: number) => images.kodyProfileYellow({resize: {width}}),
}

function getAvatarForUser(
  {email, team, firstName}: Pick<User, 'email' | 'team' | 'firstName'>,
  {size = defaultAvatarSize}: {size?: number} = {},
) {
  return {
    src: getAvatar(email, {fallback: avatarFallbacks[team](size), size}),
    alt: firstName,
  }
}

const teamTextColorClasses: Record<OptionalTeam, string> = {
  YELLOW: 'text-team-yellow',
  BLUE: 'text-team-blue',
  RED: 'text-team-red',
  UNKNOWN: 'text-team-unknown',
}

const teamDisplay: Record<Team, string> = {
  RED: 'Red',
  BLUE: 'Blue',
  YELLOW: 'Yellow',
}

const useSSRLayoutEffect =
  typeof window === 'undefined' ? () => {} : React.useLayoutEffect

type AnchorProps = React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>

const AnchorOrLink = React.forwardRef<
  HTMLAnchorElement,
  AnchorProps & {prefetch?: 'intent' | 'none' | 'render'; reload?: boolean}
>(function AnchorOrLink(props, ref) {
  const {href = '', download, reload = false, prefetch, ...rest} = props
  if (reload || download || href.startsWith('http') || href.startsWith('#')) {
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    return <a {...rest} download={download} href={href} ref={ref} />
  } else {
    return <Link prefetch={prefetch} to={href} {...rest} ref={ref} />
  }
})

function formatTime(seconds: number) {
  return dateFns.format(dateFns.addSeconds(new Date(0), seconds), 'mm:ss')
}

const formatNumber = (num: number) => new Intl.NumberFormat().format(num)

function formatAbbreviatedNumber(num: number) {
  return num < 1_000
    ? formatNumber(num)
    : num < 1_000_000
    ? `${formatNumber(Number((num / 1_000).toFixed(2)))}k`
    : num < 1_000_000_000
    ? `${formatNumber(Number((num / 1_000_000).toFixed(2)))}m`
    : num < 1_000_000_000_000
    ? `${formatNumber(Number((num / 1_000_000_000).toFixed(2)))}b`
    : 'a lot'
}

function formatDate(dateString: string) {
  return dateFns.format(
    dateFns.add(dateFns.parseISO(dateString), {
      minutes: new Date().getTimezoneOffset(),
    }),
    'PPP',
  )
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

function removeTrailingSlash(s: string) {
  return s.endsWith('/') ? s.slice(0, -1) : s
}

function getDisplayUrl(requestInfo?: {origin: string; path: string}) {
  return getUrl(requestInfo).replace(/^https?:\/\//, '')
}

function getUrl(requestInfo?: {origin: string; path: string}) {
  return removeTrailingSlash(
    `${requestInfo?.origin ?? 'https://kentcdodds.com'}${
      requestInfo?.path ?? ''
    }`,
  )
}

function toBase64(string: string) {
  if (typeof window === 'undefined') {
    return Buffer.from(string).toString('base64')
  } else {
    return window.btoa(string)
  }
}

function useUpdateQueryStringValueWithoutNavigation(
  queryKey: string,
  queryValue: string,
) {
  React.useEffect(() => {
    const currentSearchParams = new URLSearchParams(window.location.search)
    const oldQuery = currentSearchParams.get(queryKey) ?? ''
    if (queryValue === oldQuery) return

    if (queryValue) {
      currentSearchParams.set(queryKey, queryValue)
    } else {
      currentSearchParams.delete(queryKey)
    }
    const newUrl = [window.location.pathname, currentSearchParams.toString()]
      .filter(Boolean)
      .join('?')
    // alright, let's talk about this...
    // Normally with remix, you'd update the params via useSearchParams from react-router-dom
    // and updating the search params will trigger the search to update for you.
    // However, it also triggers a navigation to the new url, which will trigger
    // the loader to run which we do not want because all our data is already
    // on the client and we're just doing client-side filtering of data we
    // already have. So we manually call `window.history.pushState` to avoid
    // the router from triggering the loader.
    window.history.pushState(null, '', newUrl)
  }, [queryKey, queryValue])
}

const reuseUsefulLoaderHeaders: HeadersFunction = ({loaderHeaders}) => {
  const headers = new Headers()
  const usefulHeaders = ['Cache-Control', 'Vary', 'Server-Timing']
  for (const headerName of usefulHeaders) {
    if (loaderHeaders.has(headerName)) {
      headers.set(headerName, loaderHeaders.get(headerName)!)
    }
  }

  return headers
}

function callAll<Args extends Array<unknown>>(
  ...fns: Array<((...args: Args) => unknown) | undefined>
) {
  return (...args: Args) => fns.forEach(fn => fn?.(...args))
}

function useDoubleCheck() {
  const [doubleCheck, setDoubleCheck] = React.useState(false)

  function getButtonProps(props?: JSX.IntrinsicElements['button']) {
    const onBlur: JSX.IntrinsicElements['button']['onBlur'] = () =>
      setDoubleCheck(false)

    const onClick: JSX.IntrinsicElements['button']['onClick'] = doubleCheck
      ? undefined
      : e => {
          e.preventDefault()
          setDoubleCheck(true)
        }

    return {
      ...props,
      onBlur: callAll(onBlur, props?.onBlur),
      onClick: callAll(onClick, props?.onClick),
    }
  }

  return {doubleCheck, getButtonProps}
}

export {
  getAvatar,
  getAvatarForUser,
  AnchorOrLink,
  getErrorMessage,
  getErrorStack,
  getNonNull,
  assertNonNull,
  useUpdateQueryStringValueWithoutNavigation,
  useSSRLayoutEffect,
  useDoubleCheck,
  typedBoolean,
  getRequiredServerEnvVar,
  getRequiredGlobalEnvVar,
  getDiscordAuthorizeURL,
  getDomainUrl,
  getUrl,
  getDisplayUrl,
  toBase64,
  removeTrailingSlash,
  reuseUsefulLoaderHeaders,
  unknownTeam,
  teams,
  teamDisplay,
  teamTextColorClasses,
  formatDate,
  formatTime,
  formatNumber,
  formatAbbreviatedNumber,
}
export {listify} from './listify'
export type {OptionalTeam}
