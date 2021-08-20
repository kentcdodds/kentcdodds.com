import * as React from 'react'
import {redirect, Headers} from 'remix'
import type {ActionFunction} from 'remix'
import {addPostRead} from '~/utils/prisma.server'
import {getSession} from '~/utils/session.server'
import {getClientSession} from '~/utils/client.server'

export const action: ActionFunction = async ({request}) => {
  const params = await request.json()
  const session = await getSession(request)
  const user = await session.getUser()
  const headers = new Headers()
  if (user) {
    await addPostRead({
      slug: params.articleSlug,
      userId: user.id,
    })
    await session.getHeaders(headers)
  } else {
    const client = await getClientSession(request)
    await addPostRead({
      slug: params.articleSlug,
      clientId: client.getClientId(),
    })
    await client.getHeaders(headers)
  }
  return redirect(new URL(request.url).pathname, {headers})
}

export const loader = () => redirect('/', {status: 404})

export default function MarkRead() {
  return <div>Oops... You should not see this.</div>
}
