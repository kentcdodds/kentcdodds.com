import {
	format as dateFormat,
	add as dateAdd,
	parseISO as dateParseISO,
} from 'date-fns'
import { type HeadersFunction } from 'react-router'
import {
	type NonNullProperties,
	type OptionalTeam,
	type Role,
	type Team,
} from '#app/types.ts'
import { type getEnv } from './env.server.ts'

// NOTE: Keep this file free of JSX/TSX dependencies.
// It is safe to import in plain Node (ex: pre-deploy healthcheck startup),
// where Node can run `.ts` but cannot execute `.tsx`.

export const teams: Array<Team> = ['RED', 'BLUE', 'YELLOW']
export const optionalTeams: Array<OptionalTeam> = [...teams, 'UNKNOWN']

const roles: Array<Role> = ['ADMIN', 'MEMBER']

export const isTeam = (team?: string): team is Team => teams.includes(team as Team)
export const isRole = (role?: string): role is Role =>
	roles.includes(role as Role)
export const getTeam = (team?: string): Team | null => (isTeam(team) ? team : null)
export const getOptionalTeam = (team?: string): OptionalTeam =>
	isTeam(team) ? team : 'UNKNOWN'

export const teamTextColorClasses: Record<OptionalTeam, string> = {
	YELLOW: 'text-team-yellow',
	BLUE: 'text-team-blue',
	RED: 'text-team-red',
	UNKNOWN: 'text-team-unknown',
}

export const teamDisplay: Record<Team, string> = {
	RED: 'Red',
	BLUE: 'Blue',
	YELLOW: 'Yellow',
}

export function formatDuration(seconds: number) {
	const mins = Math.floor(seconds / 60)
		.toString()
		.padStart(2, '0')
	const secs = (seconds % 60).toFixed().padStart(2, '0')
	return `${mins}:${secs}`
}

export const formatNumber = (num: number) => new Intl.NumberFormat().format(num)

export function formatAbbreviatedNumber(num: number) {
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

export function parseDate(dateString: string) {
	return dateAdd(dateParseISO(dateString), {
		minutes: new Date().getTimezoneOffset(),
	})
}

export function formatDate(dateString: string | Date, format = 'PPP') {
	if (typeof dateString !== 'string') {
		dateString = dateString.toISOString()
	}
	return dateFormat(parseDate(dateString), format)
}

export function getErrorMessage(error: unknown, fallback: string = 'Unknown Error') {
	if (typeof error === 'string') return error
	if (error instanceof Error) return error.message
	return fallback
}

export function getErrorStack(error: unknown, fallback: string = 'Unknown Error') {
	if (typeof error === 'string') return error
	if (error instanceof Error) return error.stack
	return fallback
}

export function assertNonNull<PossibleNullType>(
	possibleNull: PossibleNullType,
	errorMessage: string,
): asserts possibleNull is Exclude<PossibleNullType, null | undefined> {
	if (possibleNull == null) throw new Error(errorMessage)
}

export function getNonNull<
	Type extends Record<string, null | undefined | unknown>,
>(obj: Type): NonNullProperties<Type> {
	for (const [key, val] of Object.entries(obj)) {
		assertNonNull(val, `The value of ${key} is null but it should not be.`)
	}
	return obj as NonNullProperties<Type>
}

export function typedBoolean<T>(
	value: T,
): value is Exclude<T, '' | 0 | false | null | undefined> {
	return Boolean(value)
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

export function getRequiredServerEnvVar(key: string, devValue?: string) {
	return getRequiredEnvVarFromObj(process.env, key, devValue)
}

export function getRequiredGlobalEnvVar(
	key: keyof ReturnType<typeof getEnv>,
	devValue?: string,
) {
	return getRequiredEnvVarFromObj(
		ENV as unknown as Record<string, string | undefined>,
		key as string,
		devValue,
	)
}

export function getDiscordAuthorizeURL(domainUrl: string) {
	const url = new URL('https://discord.com/api/oauth2/authorize')
	url.searchParams.set('client_id', getRequiredGlobalEnvVar('DISCORD_CLIENT_ID'))
	url.searchParams.set('redirect_uri', `${domainUrl}/discord/callback`)
	url.searchParams.set('response_type', 'code')
	url.searchParams.set('scope', 'identify guilds.join email guilds')
	return url.toString()
}

/**
 * @returns domain URL (without a ending slash, like: https://kentcdodds.com)
 */
export function getDomainUrl(request: Request) {
	const host =
		request.headers.get('X-Forwarded-Host') ?? request.headers.get('host')
	if (!host) {
		throw new Error('Could not determine domain URL.')
	}
	const protocol = host.includes('localhost') ? 'http' : 'https'
	return `${protocol}://${host}`
}

export function isResponse(response: unknown): response is Response {
	return (
		typeof response === 'object' &&
		response !== null &&
		'status' in response &&
		'headers' in response &&
		'body' in response
	)
}

export function removeTrailingSlash(s: string) {
	return s.endsWith('/') ? s.slice(0, -1) : s
}

export function getDisplayUrl(requestInfo?: { origin: string; path: string }) {
	return getUrl(requestInfo).replace(/^https?:\/\//, '')
}

export function getOrigin(requestInfo?: { origin?: string; path: string }) {
	return requestInfo?.origin ?? 'https://kentcdodds.com'
}

export function getUrl(requestInfo?: { origin: string; path: string }) {
	return removeTrailingSlash(`${getOrigin(requestInfo)}${requestInfo?.path ?? ''}`)
}

export function toBase64(string: string) {
	if (typeof window === 'undefined') {
		return Buffer.from(string).toString('base64')
	} else {
		return window.btoa(string)
	}
}

export const reuseUsefulLoaderHeaders: HeadersFunction = ({
	loaderHeaders,
	parentHeaders,
}) => {
	const headers = new Headers()
	const usefulHeaders = ['Cache-Control', 'Vary', 'Server-Timing']
	for (const headerName of usefulHeaders) {
		if (loaderHeaders.has(headerName)) {
			headers.set(headerName, loaderHeaders.get(headerName)!)
		}
	}
	const appendHeaders = ['Server-Timing']
	for (const headerName of appendHeaders) {
		if (parentHeaders.has(headerName)) {
			headers.append(headerName, parentHeaders.get(headerName)!)
		}
	}
	const useIfNotExistsHeaders = ['Cache-Control', 'Vary']
	for (const headerName of useIfNotExistsHeaders) {
		if (!headers.has(headerName) && parentHeaders.has(headerName)) {
			headers.set(headerName, parentHeaders.get(headerName)!)
		}
	}
	return headers
}

export function requireValidSlug(slug: unknown): asserts slug is string {
	if (typeof slug !== 'string' || !/^[a-zA-Z0-9-_.]+$/.test(slug)) {
		throw new Response(`This is not a valid slug: "${slug}"`, { status: 400 })
	}
}

export { listify } from './listify.ts'
export type { OptionalTeam } from '#app/types.ts'

