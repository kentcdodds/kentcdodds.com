import * as React from 'react'
import type {Loader} from '@remix-run/data'
import {json, redirect} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import {requireUser, confirmUser, rootStorage} from '../../utils/session.server'

export const loader: Loader = ({request}) => {
  return requireUser(request)(async () => {
    const code = new URL(request.url).searchParams.get('oobCode')
    if (!code) return json({error: 'Code required to confirm'})
    try {
      await confirmUser(code)

      const session = await rootStorage.getSession(
        request.headers.get('Cookie'),
      )
      session.unset('token')
      session.flash(
        'message',
        `Your account is now confirmed, please login again to continue.`,
      )
      const cookie = await rootStorage.commitSession(session)

      return redirect(`/login`, {headers: {'Set-Cookie': cookie}})
    } catch (error: unknown) {
      let message = 'Unknown error'
      if (error instanceof Error) {
        message = error.message
      }
      return json({error: message})
    }
  })
}

function ConfirmScreen() {
  const data = useRouteData()
  return (
    <div>
      <div>There was an error:</div>
      <pre>{data.error}</pre>
    </div>
  )
}

export default ConfirmScreen
