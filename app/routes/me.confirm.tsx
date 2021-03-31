import * as React from 'react'
import type {LoaderFunction, ActionFunction} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {useRouteData} from '@remix-run/react'
import {
  confirmUser,
  rootStorage,
  getEmailAddressForPasswordResetCode,
  resetUsersPassword,
} from '../utils/session.server'

export const loader: LoaderFunction = async ({request}) => {
  const params = new URL(request.url).searchParams
  const mode = params.get('mode')
  const code = params.get('oobCode')
  const continueUrl = params.get('continueUrl') ?? '/login'
  if (!code || !mode) return json({error: 'Invalid link'})

  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const sessionError = session.get('error')
  const responseData: Record<string, unknown> = {
    mode,
    code,
    error: sessionError,
  }

  try {
    if (mode === 'resetPassword') {
      responseData.emailAddress = await getEmailAddressForPasswordResetCode(
        code,
      )
    } else if (mode === 'verifyEmail') {
      await confirmUser(code)

      session.unset('token')
      session.flash(
        'message',
        `Your account is now confirmed, please login to continue.`,
      )
      const cookie = await rootStorage.commitSession(session)

      return redirect(continueUrl, {headers: {'Set-Cookie': cookie}})
    } else if (!responseData.error) {
      responseData.error = 'Invalid link'
    }
  } catch (error: unknown) {
    responseData.error = 'Unknown error'
    if (error instanceof Error) {
      responseData.error = error.message
    }
  }

  const cookie = await rootStorage.commitSession(session)
  return json(responseData, {headers: {'Set-Cookie': cookie}})
}

export const action: ActionFunction = async ({request}) => {
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const params = new URLSearchParams(await request.text())
  const code = String(params.get('code')) // it's really not possible to get this far without a code
  const newPassword = params.get('newPassword')
  if (!newPassword || newPassword.length < 6) {
    const redirectParams = new URLSearchParams()
    redirectParams.set('mode', 'resetPassword')
    redirectParams.set('oobCode', code)

    session.flash(
      'error',
      `A new password is required and must be at least 6 characters`,
    )
    const cookie = await rootStorage.commitSession(session)

    return redirect(`/me/confirm?${redirectParams.toString()}`, {
      headers: {'Set-Cookie': cookie},
    })
  }
  await resetUsersPassword(code, newPassword)

  session.unset('token')
  session.flash(
    'message',
    `Your password has been reset. Please sign in to continue.`,
  )
  const cookie = await rootStorage.commitSession(session)

  return redirect('/login', {headers: {'Set-Cookie': cookie}})
}

function ConfirmScreen() {
  const data = useRouteData()
  const errorUI = data.error ? (
    <div>
      <div>There was an error:</div>
      <pre>{data.error}</pre>
    </div>
  ) : null
  if (data.mode === 'resetPassword') {
    return (
      <div>
        <div>Please choose a new password for {data.emailAddress}:</div>
        <form method="post" action="/me/confirm">
          <input type="hidden" name="code" value={data.code} />
          <div>
            <label htmlFor="password">Password:</label>
            <input id="password" name="newPassword" type="password" />
          </div>
          <div>
            <button type="submit">Submit New Password</button>
          </div>
          {errorUI}
        </form>
      </div>
    )
  }
  return errorUI
}

export default ConfirmScreen
