import type {Loader, Action} from '@remix-run/data'
import {json, redirect} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import * as React from 'react'
import {Outlet} from 'react-router'
import {
  requireUser,
  rootStorage,
  sendCurrentUserConfirmationEmail,
} from '../utils/session.server'

export const loader: Loader = ({request}) => {
  return requireUser(request)(async ({sessionUser, user}) => {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    const message = session.get('message')
    const cookie = await rootStorage.commitSession(session)

    return json({sessionUser, user, message}, {headers: {'Set-Cookie': cookie}})
  })
}

export const action: Action = async ({request}) => {
  const params = new URLSearchParams(await request.text())
  if (params.get('actionId') === 'logout') {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    const cookie = await rootStorage.destroySession(session)

    return redirect('/', {headers: {'Set-Cookie': cookie}})
  }
  if (params.get('actionId') === 'send confirmation email') {
    return sendCurrentUserConfirmationEmail(request)
  }

  return redirect('/me')
}

function YouScreen() {
  const data = useRouteData()
  return (
    <div>
      <h1>User: {data.sessionUser.email}</h1>
      <div>Team: {data.user.team}</div>
      {data.message ? <div>{data.message}</div> : null}
      <div>Email verified: {String(data.sessionUser.email_verified)}</div>
      {data.sessionUser.email_verified ? (
        'Your email is verified'
      ) : (
        <div>
          You must confirm your email address to continue. Please check{' '}
          {data.sessionUser.email} for a confirmation email.
          <form method="post" action="/me">
            <button
              name="actionId"
              value="send confirmation email"
              type="submit"
            >
              Send another confirmation email
            </button>
          </form>
        </div>
      )}
      <div>
        <form method="post" action="/me">
          <button name="actionId" value="logout" type="submit">
            Logout
          </button>
        </form>
      </div>
      <Outlet />
    </div>
  )
}

export default YouScreen
