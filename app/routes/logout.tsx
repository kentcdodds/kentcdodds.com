import type {LoaderFunction} from 'remix'
import {redirect} from 'remix'
import * as React from 'react'
import {getSession} from '../utils/session.server'

export const loader: LoaderFunction = async ({request}) => {
  const session = await getSession(request)
  session.signOut()
  return redirect('/', {
    headers: {
      'Set-Cookie': await session.destroy(),
    },
  })
}

export default function Logout() {
  return (
    <div>
      {`Congrats! You're seeing something you shouldn't ever be able to see because you should have been redirected. Good job!`}
    </div>
  )
}
