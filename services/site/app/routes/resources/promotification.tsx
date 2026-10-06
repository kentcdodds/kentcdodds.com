// A full stack component + action for promotional notification messages.
// The user can dismiss a promo via an httpOnly cookie, either temporarily or once.
import { invariantResponse } from '@epic-web/invariant'
import * as cookie from 'cookie'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { useRevalidator, data as json } from 'react-router'
import { useSpinDelay } from 'spin-delay'

import { useCountdown } from '#app/components/hooks/use-countdown.ts'
import { AlarmIcon } from '#app/components/icons.tsx'
import { NotificationMessage } from '#app/components/notification-message.tsx'
import { Spinner } from '#app/components/spinner.tsx'
import { type Route } from './+types/promotification'

export const PROMO_HIDDEN_COOKIE_VALUE = 'hidden'
const DEFAULT_PROMO_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 * 2
const MAX_PROMO_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10

export function getPromoCookieValue({
	promoName,
	request,
}: {
	promoName: string
	request: Request
}) {
	const cookies = cookie.parse(request.headers.get('Cookie') || '')
	return cookies[promoName]
}

export function createPromoHiddenSetCookieHeader({
	promoName,
	maxAge = DEFAULT_PROMO_MAX_AGE_SECONDS,
}: {
	promoName: string
	maxAge?: number
}) {
	return cookie.serialize(promoName, PROMO_HIDDEN_COOKIE_VALUE, {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge,
	})
}

export async function loader() {
	return json({ success: false, error: 'Method Not Allowed' } as const, {
		status: 405,
		headers: { Allow: 'POST' },
	})
}

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== 'POST') {
		return json({ success: false, error: 'Method Not Allowed' } as const, {
			status: 405,
			headers: { Allow: 'POST' },
		})
	}

	const formData = await request.formData()
	const promoName = formData.get('promoName')
	invariantResponse(typeof promoName === 'string', 'promoName must be a string')

	// Cookie names must be a valid RFC 6265 token (no whitespace, semicolons, etc).
	// This is developer-controlled in our forms, but the endpoint is public.
	if (!/^[a-zA-Z0-9._-]+$/.test(promoName)) {
		return json({ success: false, error: 'Invalid promoName' } as const, {
			status: 400,
		})
	}

	const rawMaxAge = Number(formData.get('maxAge'))
	const maxAge =
		Number.isFinite(rawMaxAge) && rawMaxAge > 0
			? Math.min(Math.floor(rawMaxAge), MAX_PROMO_MAX_AGE_SECONDS)
			: DEFAULT_PROMO_MAX_AGE_SECONDS

	const cookieHeader = createPromoHiddenSetCookieHeader({ promoName, maxAge })
	return json({ success: true } as const, {
		headers: { 'Set-Cookie': cookieHeader },
	})
}

/**
 * Best-effort promo dismiss cookie write. Offline / flaky mobile networks reject
 * `fetch` with TypeError (Chrome "Failed to fetch", Safari "Load failed",
 * Firefox "NetworkError…") — catch so callers never surface that as a React
 * Router fetcher action error (which `setFetcherError` would put on the nearest
 * ErrorBoundary and take down the page) (KCD-10H / KCD-Y0).
 *
 * Prefer plain `fetch` over `useFetcher().submit`: fetcher actions also trigger
 * fog-of-war `__manifest` discovery, which can fail the same way before POST.
 */
export async function dismissPromotification({
	promoName,
	maxAge,
}: {
	promoName: string
	maxAge: number
}): Promise<{ success: true } | { success: false; error: string } | undefined> {
	try {
		const response = await fetch('/resources/promotification', {
			method: 'POST',
			body: new URLSearchParams({
				promoName,
				maxAge: String(maxAge),
			}),
		})
		if (!response.ok) {
			let error = 'Could not save preference. Please try again.'
			try {
				const body: unknown = await response.json()
				if (
					body &&
					typeof body === 'object' &&
					'success' in body &&
					(body as { success?: unknown }).success === false &&
					'error' in body &&
					typeof (body as { error?: unknown }).error === 'string'
				) {
					error = (body as { error: string }).error
				}
			} catch {
				// Non-JSON error bodies (edge HTML, empty) — keep the generic message.
			}
			return { success: false, error }
		}
		return { success: true }
	} catch {
		return undefined
	}
}

type NotificationMessageProps = Parameters<typeof NotificationMessage>[0]
const ONE_TIME_PROMOTIFICATION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10

export function Promotification({
	children,
	promoName,
	dismissTimeSeconds = 60 * 60 * 24 * 4,
	cookieValue,
	promoEndTime,
	hidePermanentlyOnInteraction = false,
	...props
}: {
	promoName: string
	/** maxAge for the cookie */
	dismissTimeSeconds?: number
	cookieValue: string | undefined
	promoEndTime?: Date
	hidePermanentlyOnInteraction?: boolean
} & NotificationMessageProps & {
		queryStringKey?: never
		autoClose?: never
		visibleMs?: never
	} & Required<Pick<NotificationMessageProps, 'children'>>) {
	const promoEndTimeMs = promoEndTime?.getTime() ?? null
	const [isPastEndTime, setIsPastEndTime] = useState(() =>
		promoEndTimeMs ? promoEndTimeMs <= Date.now() : false,
	)

	const [visible, setVisible] = useState(
		cookieValue !== PROMO_HIDDEN_COOKIE_VALUE,
	)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [dismissError, setDismissError] = useState<string | null>(null)
	const [dismissedSubmittedPromo, setDismissedSubmittedPromo] = useState(false)
	const revalidator = useRevalidator()
	const revalidatedEndTimeRef = React.useRef<number | null>(null)
	const showSpinner = useSpinDelay(isSubmitting)
	const disableLink = isSubmitting || dismissedSubmittedPromo

	function submitDismiss(
		maxAge: number,
		{ hideLocally }: { hideLocally: boolean },
	) {
		if (hideLocally) setVisible(false)
		setDismissError(null)
		setIsSubmitting(true)
		void dismissPromotification({ promoName, maxAge }).then((result) => {
			setIsSubmitting(false)
			if (result === undefined) {
				// Network failure — best-effort. Keep local hide when already hidden;
				// for "Remind me later" (still visible), show the inline error.
				if (!hideLocally) {
					setDismissError('Could not save preference. Please try again.')
				}
				return
			}
			if (result.success === false) {
				setDismissError(result.error)
				return
			}
			setDismissedSubmittedPromo(true)
			setVisible(false)
		})
	}

	function handleInteraction(event: React.MouseEvent<HTMLDivElement>) {
		if (!hidePermanentlyOnInteraction) return
		if (isSubmitting || dismissedSubmittedPromo) return
		const target = event.target
		if (!(target instanceof HTMLElement)) return
		const interactiveElement = target.closest(
			'a, button, input, select, textarea, [role="button"], [role="link"]',
		)
		if (!interactiveElement) return
		if (interactiveElement.closest('[data-promotification-snooze]')) return
		submitDismiss(ONE_TIME_PROMOTIFICATION_MAX_AGE_SECONDS, {
			hideLocally: true,
		})
	}

	useEffect(() => {
		setVisible(cookieValue !== PROMO_HIDDEN_COOKIE_VALUE)
		setDismissedSubmittedPromo(false)
		setDismissError(null)
	}, [cookieValue, promoName])

	useEffect(() => {
		// `promoEndTime` can change if a parent swaps promos; keep this derived.
		setIsPastEndTime(promoEndTimeMs ? promoEndTimeMs <= Date.now() : false)
	}, [promoEndTimeMs])

	// Key fix for issue #462: compute from absolute end time each tick so we jump
	// after tab inactivity rather than counting down rapidly to catch up.
	const timeLeft = useCountdown(promoEndTimeMs ?? 0, 1000)
	const completed = promoEndTimeMs ? timeLeft <= 0 : false
	const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
	const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24)
	const minutes = Math.floor((timeLeft / 1000 / 60) % 60)
	const seconds = Math.floor((timeLeft / 1000) % 60)

	useEffect(() => {
		if (!completed || !promoEndTimeMs) return
		setIsPastEndTime(true)
		if (revalidatedEndTimeRef.current === promoEndTimeMs) return
		revalidatedEndTimeRef.current = promoEndTimeMs
		revalidator.revalidate()
	}, [completed, promoEndTimeMs, revalidator])

	if (promoEndTime && (isPastEndTime || completed)) return null

	return (
		<NotificationMessage
			{...props}
			autoClose={false}
			visible={visible}
			onDismiss={() => {
				setVisible(false)
				if (hidePermanentlyOnInteraction) {
					submitDismiss(ONE_TIME_PROMOTIFICATION_MAX_AGE_SECONDS, {
						hideLocally: true,
					})
				}
			}}
		>
			<div onClickCapture={handleInteraction}>
				{children}
				{promoEndTime ? (
					<div className="mt-4">
						<>
							<div className="flex flex-col gap-4 border-t border-gray-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
								<div
									aria-label="promotion time remaining"
									className="grid grid-cols-4 gap-2 text-center tabular-nums"
								>
									<span className="rounded-md bg-white/10 px-2 py-1">
										<span className="block text-base font-semibold">
											{days}
										</span>
										<span className="text-secondary block text-xs tracking-wide uppercase">
											day{days === 1 ? '' : 's'}
										</span>
									</span>
									<span className="rounded-md bg-white/10 px-2 py-1">
										<span className="block text-base font-semibold">
											{hours}
										</span>
										<span className="text-secondary block text-xs tracking-wide uppercase">
											hour{hours === 1 ? '' : 's'}
										</span>
									</span>
									<span className="rounded-md bg-white/10 px-2 py-1">
										<span className="block text-base font-semibold">
											{minutes}
										</span>
										<span className="text-secondary block text-xs tracking-wide uppercase">
											min{minutes === 1 ? '' : 's'}
										</span>
									</span>
									<span className="rounded-md bg-white/10 px-2 py-1">
										<span className="block text-base font-semibold">
											{seconds}
										</span>
										<span className="text-secondary block text-xs tracking-wide uppercase">
											sec{seconds === 1 ? '' : 's'}
										</span>
									</span>
								</div>
								<div className="flex flex-wrap items-center gap-2 sm:justify-end">
									{dismissError ? (
										<p className="text-sm text-red-500" role="alert">
											{dismissError}
										</p>
									) : null}
									<button
										type="button"
										className={`inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-2 text-sm font-medium whitespace-nowrap text-white transition hover:bg-white/10 focus:ring-2 focus:ring-white/50 focus:outline-none ${
											showSpinner ? 'opacity-50' : ''
										}`}
										data-promotification-snooze
										disabled={disableLink}
										onClick={() =>
											submitDismiss(dismissTimeSeconds, {
												hideLocally: false,
											})
										}
									>
										<span>Remind me later</span>
										<AlarmIcon />
									</button>
									<Spinner size={16} showSpinner={showSpinner} />
								</div>
							</div>
						</>
					</div>
				) : null}
			</div>
		</NotificationMessage>
	)
}
