import type {LoaderFunction} from 'remix'
import {redirect} from 'remix'
import * as React from 'react'
import {rootStorage, signOutSession} from '../utils/session.server'

export const loader: LoaderFunction = async ({request}) => {
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  await signOutSession(session)

  return redirect('/', {
    headers: {'Set-Cookie': await rootStorage.commitSession(session)},
  })
}

export default function Logout() {
  return (
    <div>
      {`Congrats! You're seeing something you shouldn't ever be able to see because you should have been redirected. Good job!`}
    </div>
  )
}
