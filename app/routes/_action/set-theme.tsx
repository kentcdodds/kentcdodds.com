import * as React from 'react'
import {redirect} from 'remix'
import type {ActionFunction} from 'remix'
import {sessionKey} from '../../theme-provider'
import {rootStorage} from '../../utils/session.server'

export const action: ActionFunction = async ({request}) => {
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const params = await request.json()
  session.set(sessionKey, params.theme)
  return redirect(new URL(request.url).pathname, {
    headers: {'Set-Cookie': await rootStorage.commitSession(session)},
  })
}

export const loader = () => redirect('/', {status: 404})

export default function MarkRead() {
  return <div>Oops... You should not see this.</div>
}
