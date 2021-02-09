import * as React from 'react'
import type {Loader, Action} from '@remix-run/data'
import {json, redirect} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import {getSession, commitSession} from '../session-storage'

const clearKey = 'CLEAR_SESSION'

export const action: Action = async ({request}) => {
  const bodyParams = new URLSearchParams(await request.text())
  if (bodyParams.get(clearKey)) {
    console.log('bodyParams.get(clearKey)', bodyParams.get(clearKey))
  }
  const clearValue = bodyParams.get(clearKey)
  const session = await getSession(request.headers.get('Cookie'))
  if (clearValue === 'error') {
    session.flash('error', 'Oh no, there is an error!')
    return redirect('/contact', {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    })
  }
  session.set('clear-value', clearValue)
  return redirect('/contact', {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  })
}

export const loader: Loader = async ({request}) => {
  console.log('loader')
  const session = await getSession(request.headers.get('Cookie'))
  return json({success: session.get('success')})
}

export default function ContactRoute() {
  const data = useRouteData()
  console.log('route', data)
  return (
    <>
      <form method="post">
        <fieldset>
          <div>
            <label htmlFor="contact-name">Name</label>
            <input name="name" id="contact-name" />
          </div>
          <div>
            <label htmlFor="contact-email">Email</label>
            <input name="email" id="contact-email" />
          </div>
          <div>
            <label htmlFor="contact-subject">Subject</label>
            <input name="subject" id="contact-subject" />
          </div>
          <div>
            <label htmlFor="contact-body">Body</label>
            <input name="body" id="contact-body" />
          </div>
          <div>
            <input type="submit" />
          </div>
        </fieldset>
      </form>
      <form method="post">
        <div>Clear thing</div>
        <button name={clearKey} value="true">
          submit
        </button>
      </form>
    </>
  )
}
