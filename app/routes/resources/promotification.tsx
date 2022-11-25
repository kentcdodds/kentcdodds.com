// This is a full stack component that controls showing a notification message
// which the user can dismiss for a period of time.
import type {DataFunctionArgs} from '@remix-run/node'
import {useEffect, useRef, useState} from 'react'
import cookie from 'cookie'
import {json} from '@remix-run/node'
import invariant from 'tiny-invariant'
import Countdown from 'react-countdown'
import {NotificationMessage} from '~/components/notification-message'
import {useFetcher} from '@remix-run/react'
import {useSpinDelay} from 'spin-delay'

import {LinkButton} from '~/components/button'
import {Spinner} from '~/components/spinner'

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

export async function action({request}: DataFunctionArgs) {
  const formData = await request.formData()
  const maxAge = Number(formData.get('maxAge')) || 60 * 60 * 24 * 7 * 2
  const promoName = formData.get('promoName')
  invariant(typeof promoName === 'string', 'promoName must be a string')

  const cookieHeader = cookie.serialize(promoName, 'hidden', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
  return json({success: true}, {headers: {'Set-Cookie': cookieHeader}})
}

type NotificationMessageProps = Parameters<typeof NotificationMessage>[0]

function ShowTime({ time, typeTime }: { time: number, typeTime: string }) {
  return (
    <span className='italic'>
      {time} {typeTime}{time === 1 ? '' : 's'}
    </span>
  )
}

export function Promotification({
  children,
  promoName,
  dismissTimeSeconds = 60 * 60 * 24 * 7 * 2,
  cookieValue,
  promoEndTime,
  ...props
}: {
  promoName: string
  /** maxAge for the cookie */
  dismissTimeSeconds?: number
  cookieValue?: string
  promoEndTime?: Date
} & NotificationMessageProps & {
    queryStringKey?: never
    autoClose?: never
    visibleMs?: never
  } & Required<Pick<NotificationMessageProps, 'children'>>) {
  const isPastEndTime = useRef(promoEndTime ? promoEndTime < new Date() : false)

  const [visible, setVisible] = useState(cookieValue !== 'hidden')
  const fetcher = useFetcher<typeof action>()
  const showSpinner = useSpinDelay(fetcher.state !== 'idle')
  const disableLink = fetcher.state !== 'idle' || fetcher.data?.success
  useEffect(() => {
    if (fetcher.data?.success) {
      setVisible(false)
    }
  }, [fetcher.data])

  if (isPastEndTime.current) return null

  return (
    <NotificationMessage
      {...props}
      autoClose={false}
      visible={visible}
      onDismiss={() => setVisible(false)}
    >
      {children}
      <div className="mt-4">
        <Countdown
          date={promoEndTime}
          renderer={({completed, days, hours, minutes: mins, seconds: secs}) =>
            completed ? (
              <div>{`Time's up. The sale is over`}</div>
            ) : (
              <div className="flex flex-wrap gap-3 tabular-nums">
                <ShowTime time={days} typeTime='day' />
                <ShowTime time={hours} typeTime='hour' />
                <ShowTime time={mins} typeTime='min' />
                <ShowTime time={secs} typeTime='sec' />
              </div>
            )
          }
        />
        <fetcher.Form action="/resources/promotification" method="post">
          <input type="hidden" name="promoName" value={promoName} />
          <input type="hidden" name="maxAge" value={dismissTimeSeconds} />
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <LinkButton
              type="submit"
              className={`text-inverse block transition-opacity ${
                showSpinner ? 'opacity-50' : ''
              }`}
              disabled={disableLink}
            >
              Remind me later{' '}
              <span role="img" aria-label="alarm clock">
                ⏰
              </span>
            </LinkButton>
            <Spinner size={16} showSpinner={showSpinner} />
          </div>
        </fetcher.Form>
      </div>
    </NotificationMessage>
  )
}
