import * as React from 'react'
import type {ActionFunction, LoaderFunction} from 'remix'
import {Form, useRouteData, json, redirect} from 'remix'
import type {User} from 'types'
import {getQrCodeDataURL} from '../utils/qrcode.server'
import {
  getDiscordAuthorizeURL,
  getDomainUrl,
  useRequestInfo,
} from '../utils/misc'
import {getMagicLink, updateUser} from '../utils/prisma.server'
import {requireUser, rootStorage, signOutSession} from '../utils/session.server'

type LoaderData = {user: User; message?: string; qrLoginCode: string}
export const loader: LoaderFunction = ({request}) => {
  return requireUser(request)(async user => {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    const message = session.get('message')
    const cookie = await rootStorage.commitSession(session)

    const qrLoginCode = await getQrCodeDataURL(
      getMagicLink({
        emailAddress: user.email,
        domainUrl: getDomainUrl(request),
        validationRequired: false,
        // make a very short expiration time because it should be scanned
        // right away anyway.
        // TODO: make sure that it's generated on-demand rather than as
        // part of the page initial request.
        expirationDate: new Date(Date.now() + 1000 * 30).toISOString(),
      }),
    )
    const loaderData: LoaderData = {user, message, qrLoginCode}
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
      <h2>User: {data.user.email}</h2>
      <div>Team: {data.user.team}</div>
      <div>
        <Form method="post" action="/me">
          <input type="hidden" name="actionId" value="logout" />
          <button type="submit">Logout</button>
        </Form>
      </div>
      <details>
        <summary>Change account details</summary>

        <Form method="post" action="/me">
          <input type="hidden" name="actionId" value="change details" />
          <div>
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              name="firstName"
              defaultValue={data.user.firstName}
            />
          </div>
          <button type="submit">Submit</button>
        </Form>
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
      <div>
        <details>
          <summary>Login on another device:</summary>
          <div>
            Scan this QR code on the other device:
            <img src={data.qrLoginCode} alt="Login QR Code" />
          </div>
        </details>
      </div>
    </div>
  )
}

export default YouScreen
