import type {Loader, Action} from '@remix-run/data'
import {json, redirect} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import * as React from 'react'
import {Outlet} from 'react-router'
import {
  changeEmail,
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
  return requireUser(request)(async ({sessionUser, user, userDoc}) => {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    const params = new URLSearchParams(await request.text())
    if (params.get('actionId') === 'logout') {
      const cookie = await rootStorage.destroySession(session)

      return redirect('/', {headers: {'Set-Cookie': cookie}})
    }
    if (params.get('actionId') === 'send confirmation email') {
      return sendCurrentUserConfirmationEmail(request)
    }
    if (params.get('actionId') === 'change details') {
      const newFirstName = params.get('firstName')!
      const newEmail = params.get('email')!
      const password = params.get('password')!
      if (sessionUser.email !== newEmail) {
        await changeEmail({sessionUser, newEmail, password})

        session.unset('token')
        session.flash(
          'message',
          `Your email has been changed. Please check ${newEmail} to confirm your email.`,
        )
        const cookie = await rootStorage.commitSession(session)

        return redirect('/login', {headers: {'Set-Cookie': cookie}})
      }
      if (user.firstName !== params.get('firstName')) {
        await userDoc.ref.set({firstName: newFirstName}, {merge: true})
      }
    }

    return redirect('/me')
  })
}

function YouScreen() {
  const data = useRouteData()
  const [email, setEmail] = React.useState(data.sessionUser.email)
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
      <details>
        <summary>Change account details</summary>

        <form method="post" action="/me">
          <div>
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              name="firstName"
              defaultValue={data.user.firstName}
            />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          {email === data.sessionUser.email ? null : (
            <div>
              <label htmlFor="password">Password</label>
              <small>Required to change your email</small>
              <input id="password" name="password" type="password" />
            </div>
          )}
          <button type="submit" name="actionId" value="change details">
            Submit
          </button>
        </form>
        <form method="post" action="/me">
          <button type="submit" name="actionId" value="reset password">
            Request Change Password Link
          </button>
        </form>
      </details>
      <Outlet />
    </div>
  )
}

export default YouScreen
