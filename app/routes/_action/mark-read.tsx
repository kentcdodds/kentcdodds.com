import * as React from 'react'
import {redirect} from 'remix'
import type {ActionFunction} from 'remix'
import {addPostRead} from '../../utils/prisma.server'
import {requireUser} from '../../utils/session.server'

export const action: ActionFunction = async ({request}) => {
  return requireUser(request, async user => {
    const params = await request.json()
    await addPostRead({
      slug: params.articleSlug,
      userId: user.id,
    })
    return redirect(new URL(request.url).pathname)
  })
}

export const loader = () => redirect('/', {status: 404})

export default function MarkRead() {
  return <div>Oops... You should not see this.</div>
}
