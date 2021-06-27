import * as React from 'react'
import type {ActionFunction, LoaderFunction} from 'remix'
import {useRouteData, json, redirect} from 'remix'
import type {User} from 'types'
import {getDiscordAuthorizeURL, useRequestInfo} from '../utils/misc'
import {updateUser} from '../utils/prisma.server'
import {requireUser, rootStorage, signOutSession} from '../utils/session.server'

type LoaderData = {user: User; message?: string}
export const loader: LoaderFunction = ({request}) => {
  return requireUser(request)(async user => {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    const message = session.get('message')
    const cookie = await rootStorage.commitSession(session)

    const loaderData: LoaderData = {user, message}
    return json(loaderData, {headers: {'Set-Cookie': cookie}})
  })
}

export const action: ActionFunction = async ({request}) => {
  return requireUser(request)(async user => {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    const params = new URLSearchParams(await request.text())
    const actionId = params.get('actionId')
    if (actionId === 'logout') {
      await signOutSession(session)

      return redirect('/', {
        headers: {'Set-Cookie': await rootStorage.commitSession(session)},
      })
    }
    if (actionId === 'change details') {
      const newFirstName = params.get('firstName')!
      if (user.firstName !== newFirstName) {
        await updateUser(user.id, {firstName: newFirstName})
      }
    }

    return redirect('/me')
  })
}

function YouScreen() {
  const data = useRouteData<LoaderData>()
  const requestInfo = useRequestInfo()
  const authorizeURL = getDiscordAuthorizeURL(requestInfo.origin)
  return (
    <div>
      {data.message ? <div>{data.message}</div> : null}
      <h1>User: {data.user.email}</h1>
      <div>Team: {data.user.team}</div>
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
          <button type="submit" name="actionId" value="change details">
            Submit
          </button>
        </form>
      </details>
      <div>
        {data.user.discordId ? (
          <div>Connected to discord account ID: {data.user.discordId}</div>
        ) : (
          <>
            <div>You wanna connect your account to discord?</div>
            <a href={authorizeURL}>Connect my KCD account to Discord</a>
          </>
        )}
      </div>
    </div>
  )
}

export default YouScreen
