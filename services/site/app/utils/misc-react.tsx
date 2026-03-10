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
import { getOptionalTeam } from './misc.ts'

export * from './misc.ts'

const defaultAvatarSize = 128

export function getAvatar(
	email: string,
	{
		size = defaultAvatarSize,
		fallback = images.kodyProfileGray({ resize: { width: size } }),
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
		if (origin && fallback.startsWith('/')) {
			fallback = `${origin}${fallback}`
		}
		url.searchParams.set('default', fallback)
	}
	return url.toString()
}

const avatarFallbacks: Record<OptionalTeam, (width: number) => string> = {
	BLUE: (width: number) => images.kodyProfileBlue({ resize: { width } }),
	RED: (width: number) => images.kodyProfileRed({ resize: { width } }),
	YELLOW: (width: number) => images.kodyProfileYellow({ resize: { width } }),
	UNKNOWN: (width: number) => images.kodyProfileGray({ resize: { width } }),
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
	if (isRouteErrorResponse(error)) {
		if (error.status < 500) return error

		Sentry.captureException(getRouteErrorResponseException(error), {
			extra: {
				route_error_response: {
					status: error.status,
					statusText: error.statusText,
					data: error.data,
				},
			},
		})
		return error
	}

	Sentry.captureException(error)
	return error
}

function getRouteErrorResponseException(error: ErrorResponse) {
	const statusText = error.statusText || 'Route Error'
	const routeErrorResponseError = new Error(`${error.status} ${statusText}`)
	routeErrorResponseError.name = 'RouteErrorResponse'
	return routeErrorResponseError
}
