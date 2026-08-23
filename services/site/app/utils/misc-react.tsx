// React/TSX-only utilities live here (hooks + components) and we re-export the
// non-JSX helpers from `misc.ts` for convenience.
//
// Prefer importing from `./misc.ts` in server-only/Node-startup code paths.
// Node can execute `.ts` but cannot execute `.tsx`.
import * as Sentry from '@sentry/react-router'
import md5 from 'md5-hash'
import * as React from 'react'
import {
	Link,
	isRouteErrorResponse,
	useRouteError,
	type ErrorResponse,
	type LinkProps,
} from 'react-router'
import { type OptionalTeam, type User } from '#app/types.ts'
import { images } from '../images.tsx'
import { buildMediaUrl } from './media.ts'
import { getOptionalTeam } from './misc.ts'
import {
	isCloudflareEdgeRouteError,
	isReactRouterSanitizedServerErrorInstance,
	isReactRouterSpaNavNetworkError,
} from './sentry-noise.ts'

const SPA_NAV_NETWORK_RELOAD_STORAGE_PREFIX = 'kcd:spa-nav-network-reload:'

function spaNavNetworkReloadStorageKey(locationKey: string): string {
	return `${SPA_NAV_NETWORK_RELOAD_STORAGE_PREFIX}${locationKey}`
}

/**
 * One-shot document reload for React Router SPA-nav network TypeErrors
 * (KCD-XZ / KCD-QG / KCD-10B). Returns whether a reload should run; marks the
 * current location so a failed second pass does not loop.
 *
 * If sessionStorage is unavailable, returns false (no reload) so a missing
 * persistence guard cannot loop document reloads — fall through to the normal
 * error UI instead.
 */
export function shouldHardReloadSpaNavNetworkError(
	error: unknown,
	storage: Pick<Storage, 'getItem' | 'setItem'>,
	locationKey: string,
): boolean {
	if (!isReactRouterSpaNavNetworkError(error)) return false
	const key = spaNavNetworkReloadStorageKey(locationKey)
	try {
		if (storage.getItem(key) === '1') return false
		storage.setItem(key, '1')
		return true
	} catch {
		return false
	}
}

/**
 * Show the brief "Reconnecting…" boundary only when a hard-reload will still
 * be attempted. After the one-shot marker is set (or when storage reads/writes
 * fail), fall through to the normal error UI instead of a stuck reconnecting
 * state. Probes `setItem` so a read-only / write-failing store does not leave
 * the UI on “Reconnecting…” with no reload.
 */
export function shouldShowSpaNavNetworkReconnecting(
	error: unknown,
	storage: Pick<Storage, 'getItem' | 'setItem'>,
	locationKey: string,
): boolean {
	if (!isReactRouterSpaNavNetworkError(error)) return false
	const key = spaNavNetworkReloadStorageKey(locationKey)
	try {
		if (storage.getItem(key) === '1') return false
		// Prove writes work before promising a reconnecting UI. A successful
		// getItem alone is not enough — setItem can still throw (Bugbot).
		storage.setItem('kcd:spa-nav-network-write-probe', '1')
		return true
	} catch {
		return false
	}
}

export * from './misc.ts'

// Gravatar's `default=` fallback must be an absolute URL (Gravatar redirects
// the browser to it). When callers thread the request origin we use it so the
// fallback works on any host (workers.dev or the custom domain); otherwise we
// fall back to the production domain.
const PRODUCTION_MEDIA_ORIGIN = 'https://kentcdodds.com'
const defaultAvatarSize = 128

export function getAvatar(
	email: string,
	{
		size = defaultAvatarSize,
		fallback = buildMediaUrl(images.kodyProfileGray.id, { width: size }),
		origin,
	}: { size?: number } & (
		| { fallback?: null; origin?: null }
		| { fallback: string; origin?: string }
	) = {},
) {
	const hash = md5(email)
	const url = new URL(`https://www.gravatar.com/avatar/${hash}`)
	url.searchParams.set('size', String(size))
	if (fallback) {
		if (fallback.startsWith('/')) {
			fallback = `${origin ?? PRODUCTION_MEDIA_ORIGIN}${fallback}`
		}
		url.searchParams.set('default', fallback)
	}
	return url.toString()
}

const avatarFallbacks: Record<OptionalTeam, (width: number) => string> = {
	BLUE: (width: number) => buildMediaUrl(images.kodyProfileBlue.id, { width }),
	RED: (width: number) => buildMediaUrl(images.kodyProfileRed.id, { width }),
	YELLOW: (width: number) =>
		buildMediaUrl(images.kodyProfileYellow.id, { width }),
	UNKNOWN: (width: number) =>
		buildMediaUrl(images.kodyProfileGray.id, { width }),
}

export function getAvatarForUser(
	{ email, team, firstName }: Pick<User, 'email' | 'team' | 'firstName'>,
	{ size = defaultAvatarSize, origin }: { size?: number; origin?: string } = {},
) {
	return {
		src: getAvatar(email, {
			fallback: avatarFallbacks[getOptionalTeam(team)](size),
			size,
			origin,
		}),
		alt: firstName,
	}
}

export const useSSRLayoutEffect =
	typeof window === 'undefined' ? () => {} : React.useLayoutEffect

type AnchorProps = React.DetailedHTMLProps<
	React.AnchorHTMLAttributes<HTMLAnchorElement>,
	HTMLAnchorElement
>

export const AnchorOrLink = function AnchorOrLink({
	ref,
	...props
}: AnchorProps & {
	reload?: boolean
	to?: LinkProps['to']
	prefetch?: LinkProps['prefetch']
}) {
	const {
		to,
		href,
		download,
		reload = false,
		prefetch,
		children,
		...rest
	} = props
	let toUrl = ''
	let shouldUserRegularAnchor = reload || download

	if (!shouldUserRegularAnchor && typeof href === 'string') {
		shouldUserRegularAnchor = href.includes(':') || href.startsWith('#')
	}

	if (!shouldUserRegularAnchor && typeof to === 'string') {
		toUrl = to
		shouldUserRegularAnchor = to.includes(':')
	}

	if (!shouldUserRegularAnchor && typeof to === 'object') {
		toUrl = `${to.pathname ?? ''}${to.hash ? `#${to.hash}` : ''}${
			to.search ? `?${to.search}` : ''
		}`
		shouldUserRegularAnchor = to.pathname?.includes(':')
	}

	if (shouldUserRegularAnchor) {
		return (
			<a {...rest} download={download} href={href ?? toUrl} ref={ref}>
				{children}
			</a>
		)
	} else {
		return (
			<Link prefetch={prefetch} to={to ?? href ?? ''} {...rest} ref={ref}>
				{children}
			</Link>
		)
	}
}

export function useUpdateQueryStringValueWithoutNavigation(
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
		window.history.replaceState(null, '', newUrl)
	}, [queryKey, queryValue])
}

function debounce<Callback extends (...args: Parameters<Callback>) => void>(
	fn: Callback,
	delay: number,
) {
	let timer: ReturnType<typeof setTimeout> | null = null
	return (...args: Parameters<Callback>) => {
		if (timer) clearTimeout(timer)
		timer = setTimeout(() => {
			fn(...args)
		}, delay)
	}
}

export function useDebounce<
	Callback extends (...args: Parameters<Callback>) => ReturnType<Callback>,
>(callback: Callback, delay: number) {
	const callbackRef = React.useRef(callback)
	React.useEffect(() => {
		callbackRef.current = callback
	})
	return React.useMemo(
		() =>
			debounce(
				(...args: Parameters<Callback>) => callbackRef.current(...args),
				delay,
			),
		[delay],
	)
}

function callAll<Args extends Array<unknown>>(
	...fns: Array<((...args: Args) => unknown) | undefined>
) {
	return (...args: Args) => fns.forEach((fn) => fn?.(...args))
}

export function useDoubleCheck() {
	const [doubleCheck, setDoubleCheck] = React.useState(false)

	function getButtonProps(props?: React.ComponentProps<'button'>) {
		const onBlur: React.ComponentProps<'button'>['onBlur'] = () =>
			setDoubleCheck(false)

		const onClick: React.ComponentProps<'button'>['onClick'] = doubleCheck
			? undefined
			: (e) => {
					e.preventDefault()
					setDoubleCheck(true)
				}

		return {
			...props,
			onBlur: callAll(onBlur, props?.onBlur),
			onClick: callAll(onClick, props?.onClick),
		}
	}

	return { doubleCheck, getButtonProps }
}

export function useCapturedRouteError() {
	const error = useRouteError()

	// SPA-nav browser network TypeError (idle tab / flaky mobile): document
	// reload usually succeeds where the client `.data` / `__manifest` fetch
	// did not (KCD-XZ / KCD-QG / KCD-10B). Guard against reload loops.
	React.useEffect(() => {
		if (typeof window === 'undefined') return
		if (
			!shouldHardReloadSpaNavNetworkError(
				error,
				window.sessionStorage,
				`${window.location.pathname}${window.location.search}`,
			)
		) {
			return
		}
		window.location.reload()
	}, [error])

	if (isRouteErrorResponse(error)) {
		if (error.status < 500) return error

		// Cloudflare edge/origin HTML (or bare empty-body 502/503/524) is not an
		// app throw — still render the boundary, but do not report to Sentry.
		if (!isCloudflareEdgeRouteError(error)) {
			Sentry.captureException(getRouteErrorResponseException(error), {
				extra: {
					route_error_response: {
						status: error.status,
						statusText: error.statusText,
						data: error.data,
					},
				},
			})
		}
		return error
	}

	// React Router production sanitizeError — empty-stack client echo of a
	// server Error already reported via entry.server handleError (KCD-SE).
	// SPA-nav network TypeErrors are recovered via hard-reload above — not
	// app throws (KCD-XZ / KCD-QG / KCD-10B).
	if (
		!isReactRouterSanitizedServerErrorInstance(error) &&
		!isReactRouterSpaNavNetworkError(error)
	) {
		Sentry.captureException(error)
	}
	return error
}

function getRouteErrorResponseException(error: ErrorResponse) {
	const statusText = error.statusText || 'Route Error'
	const routeErrorResponseError = new Error(`${error.status} ${statusText}`)
	routeErrorResponseError.name = 'RouteErrorResponse'
	return routeErrorResponseError
}
