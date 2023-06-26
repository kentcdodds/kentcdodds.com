// This is a full stack component that controls showing a notification message
// which the user can dismiss for a period of time.
import {json, type DataFunctionArgs} from '@remix-run/node'
import {useFetcher} from '@remix-run/react'
import cookie from 'cookie'
import {useEffect, useRef, useState} from 'react'
import useCountDown from 'react-countdown-hook'
import {useSpinDelay} from 'spin-delay'
import invariant from 'tiny-invariant'
import {NotificationMessage} from '~/components/notification-message.tsx'

import {LinkButton} from '~/components/button.tsx'
import {AlarmIcon} from '~/components/icons.tsx'
import {Spinner} from '~/components/spinner.tsx'

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
  const initialTime = promoEndTime.getTime() - new Date().getTime()
  const isPastEndTime = useRef(promoEndTime < new Date())

  const [visible, setVisible] = useState(cookieValue !== 'hidden')
  const fetcher = useFetcher<typeof action>()
  const showSpinner = useSpinDelay(fetcher.state !== 'idle')
  const disableLink = fetcher.state !== 'idle' || fetcher.data?.success
  useEffect(() => {
    if (fetcher.data?.success) {
      setVisible(false)
    }
  }, [fetcher.data])

  const [timeLeft, {start}] = useCountDown(initialTime, 1000)
  useEffect(() => {
    if (isPastEndTime.current) return
    start()
  }, [start])
  const completed = timeLeft <= 0
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60)
  const seconds = Math.floor((timeLeft / 1000) % 60)

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
        {completed ? (
          <div>{`Time's up. The sale is over`}</div>
        ) : (
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
        )}
        <fetcher.Form action="/resources/promotification" method="POST">
          <input type="hidden" name="promoName" value={promoName} />
          <input type="hidden" name="maxAge" value={dismissTimeSeconds} />
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
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
      </div>
    </NotificationMessage>
  )
}
