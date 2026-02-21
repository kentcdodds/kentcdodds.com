// A full stack component + action for promotional notification messages.
// The user can dismiss (snooze) the promo for a period of time via an httpOnly cookie.
import * as cookie from 'cookie'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { useFetcher, data as json } from 'react-router'
import { useSpinDelay } from 'spin-delay'
import invariant from 'tiny-invariant'

import { LinkButton } from '#app/components/button.tsx'
import { useCountdown } from '#app/components/hooks/use-countdown.ts'
import { AlarmIcon } from '#app/components/icons.tsx'
import { NotificationMessage } from '#app/components/notification-message.tsx'
import { Spinner } from '#app/components/spinner.tsx'
import { type Route } from './+types/promotification'

export function getPromoCookieValue({
	promoName,
	request,
}: {
	promoName: string
	request: Request
}) {
	const cookies = cookie.parseCookie(request.headers.get('Cookie') || '')
	return cookies[promoName]
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const promoName = formData.get('promoName')
	invariant(typeof promoName === 'string', 'promoName must be a string')

	// Cookie names must be a valid RFC 6265 token (no whitespace, semicolons, etc).
	// This is developer-controlled in our forms, but the endpoint is public.
	if (!/^[a-zA-Z0-9._-]+$/.test(promoName)) {
		return json(
			{ success: false, error: 'Invalid promoName' },
			{ status: 400 },
		)
	}

	const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 * 2
	const MAX_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days ceiling
	const rawMaxAge = Number(formData.get('maxAge'))
	const maxAge =
		Number.isFinite(rawMaxAge) && rawMaxAge > 0
			? Math.min(Math.floor(rawMaxAge), MAX_MAX_AGE_SECONDS)
			: DEFAULT_MAX_AGE_SECONDS

	const cookieHeader = cookie.stringifySetCookie({
		name: promoName,
		value: 'hidden',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge,
	})
	return json({ success: true }, { headers: { 'Set-Cookie': cookieHeader } })
}

type NotificationMessageProps = Parameters<typeof NotificationMessage>[0]

export function Promotification({
	children,
	promoName,
	dismissTimeSeconds = 60 * 60 * 24 * 4,
	cookieValue,
	promoEndTime,
	...props
}: {
	promoName: string
	/** maxAge for the cookie */
	dismissTimeSeconds?: number
	cookieValue: string | undefined
	promoEndTime: Date
} & NotificationMessageProps & {
		queryStringKey?: never
		autoClose?: never
		visibleMs?: never
	} & Required<Pick<NotificationMessageProps, 'children'>>) {
	const promoEndTimeMs = promoEndTime.getTime()
	const [isPastEndTime, setIsPastEndTime] = useState(
		() => promoEndTimeMs <= Date.now(),
	)

	const [visible, setVisible] = useState(cookieValue !== 'hidden')
	const fetcher = useFetcher<typeof action>()
	const showSpinner = useSpinDelay(fetcher.state !== 'idle')
	const disableLink = fetcher.state !== 'idle' || fetcher.data?.success

	useEffect(() => {
		if (fetcher.data?.success) {
			setVisible(false)
		}
	}, [fetcher.data])

	const dismissError =
		fetcher.state === 'idle' && fetcher.data?.success === false
			? (fetcher.data?.error ?? 'Could not dismiss. Please try again.')
			: null

	useEffect(() => {
		// `promoEndTime` can change if a parent swaps promos; keep this derived.
		setIsPastEndTime(promoEndTimeMs <= Date.now())
	}, [promoEndTimeMs])

	// Key fix for issue #462: compute from absolute end time each tick so we jump
	// after tab inactivity rather than counting down rapidly to catch up.
	const timeLeft = useCountdown(promoEndTimeMs, 1000)
	const completed = timeLeft <= 0
	const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
	const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24)
	const minutes = Math.floor((timeLeft / 1000 / 60) % 60)
	const seconds = Math.floor((timeLeft / 1000) % 60)

	if (isPastEndTime) return null

	return (
		<NotificationMessage
			{...props}
			autoClose={false}
			visible={visible}
			onDismiss={() => setVisible(false)}
		>
			{children}
			<div className="mt-4">
				{completed ? (
					<div>{`Time's up. The sale is over`}</div>
				) : (
					<>
						<div className="flex flex-wrap gap-3 tabular-nums">
							<span>
								{days} day{days === 1 ? '' : 's'}
							</span>
							<span>
								{hours} hour{hours === 1 ? '' : 's'}
							</span>
							<span>
								{minutes} min{minutes === 1 ? '' : 's'}
							</span>
							<span>
								{seconds} sec{seconds === 1 ? '' : 's'}
							</span>
						</div>
						<fetcher.Form action="/resources/promotification" method="POST">
							<input type="hidden" name="promoName" value={promoName} />
							<input type="hidden" name="maxAge" value={dismissTimeSeconds} />
							<div className="mt-4 flex flex-wrap items-center justify-end gap-2">
								{dismissError ? (
									<p className="text-sm text-red-500" role="alert">
										{dismissError}
									</p>
								) : null}
								<LinkButton
									type="submit"
									className={`text-inverse flex items-center gap-1 transition-opacity ${
										showSpinner ? 'opacity-50' : ''
									}`}
									disabled={disableLink}
								>
									<span>Remind me later</span>
									<AlarmIcon />
								</LinkButton>
								<Spinner size={16} showSpinner={showSpinner} />
							</div>
						</fetcher.Form>
					</>
				)}
			</div>
		</NotificationMessage>
	)
}

