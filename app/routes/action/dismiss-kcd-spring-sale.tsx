import * as React from 'react'
import type {ActionFunction} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {getKCDSpringSaleSession} from '~/utils/kcd-spring-sale-message.server'

export const action: ActionFunction = async ({request}) => {
  const saleSession = await getKCDSpringSaleSession(request)
  saleSession.setDismissed()
  const form = await request.formData()
  const intent = form.get('action')
  const headers = new Headers()
  if (typeof intent === 'string' && intent === 'remind-kcd-spring-sale') {
    const cookie = await saleSession.commit({
      maxAge: 60 * 60 * 18, // remind them in 18 hours
    })
    if (cookie) headers.set('Set-Cookie', cookie)
  } else {
    await saleSession.getHeaders(headers)
  }
  return json({success: true}, {headers})
}

export const loader = () => redirect('/', {status: 404})

export default function MarkRead() {
  return <div>Oops... You should not see this.</div>
}
