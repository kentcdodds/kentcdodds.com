import * as React from 'react'
import type {Loader, Action} from '@remix-run/data'
import {json} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import {sendContactEmail} from '../utils/send-contact-email'
import {getSession} from '../session-storage'

export const action: Action = sendContactEmail

export const loader: Loader = async ({request}) => {
  const session = await getSession(request.headers.get('Cookie') ?? undefined)
  return json({error: session.get('error')})
}

export default function ContactRoute() {
  const data = useRouteData()
  console.log('route', data)
  return (
    <div>
      <h1>Contact Kent</h1>
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
        {data.error ? (
          <div role="alert" className="text-red-800 dark:text-red-300">
            {data.error}
          </div>
        ) : null}
      </form>
    </div>
  )
}
