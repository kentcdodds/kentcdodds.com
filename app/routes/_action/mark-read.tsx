import * as React from 'react'
import {redirect} from 'remix'
import type {ActionFunction} from 'remix'
import {addPostRead} from '../../utils/prisma.server'
import {requireUser} from '../../utils/session.server'

export const action: ActionFunction = async ({request}) => {
  return requireUser(request)(async user => {
    const params = await request.json()
    const result = await addPostRead({
      slug: params.articleSlug,
      userId: user.id,
    })
    if (result) {
      console.log('read marked')
    } else {
      console.log('already read in the last 24 hours')
    }
    return redirect(request.url)
  })
}

export const loader = () => redirect('/')

export default function MarkRead() {
  return <div>Oops... You should not see this.</div>
}
