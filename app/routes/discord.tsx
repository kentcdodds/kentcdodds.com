import * as React from 'react'
import type {LoaderFunction} from 'remix'
import {json, useRouteData} from 'remix'
import {getRequiredGlobalEnvVar, useOptionalUser} from '../utils/misc'

type LoaderData = {}

export const loader: LoaderFunction = async () => {
  const data: LoaderData = {}
  return json(data)
}

function getAuthorizeURL() {
  const url = new URL('https://discord.com/api/oauth2/authorize')
  url.searchParams.set(
    'client_id',
    getRequiredGlobalEnvVar('DISCORD_CLIENT_ID'),
  )
  url.searchParams.set(
    'redirect_uri',
    getRequiredGlobalEnvVar('DISCORD_REDIRECT_URI'),
  )
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'identify guilds.join email guilds')
  return url.toString()
}

export default function Discord() {
  const data = useRouteData<LoaderData>()
  const user = useOptionalUser()
  const authorizeURL = user ? getAuthorizeURL() : null
  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      {user && authorizeURL ? (
        <>
          <div>
            Hello {user.firstName}. You wanna connect your account to discord?
          </div>
          <a href={authorizeURL}>Connect my KCD account to Discord</a>
        </>
      ) : null}
    </div>
  )
}

export function ErrorBoundary({error}: {error: Error}) {
  return (
    <div>
      <h1>Error</h1>
      <pre>{error.stack}</pre>
    </div>
  )
}
