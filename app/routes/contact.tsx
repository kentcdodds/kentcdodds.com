import {useRouteData} from '@remix-run/react'
import * as React from 'react'
import {KCDLoader, KCDAction} from 'types'
import {sendSessionValue} from '../utils/load-session'
import {sendContactEmail} from '../utils/send-contact-email.server'

export const action: KCDAction = sendContactEmail
export const loader: KCDLoader = (...args) =>
  sendSessionValue({error: null})(...args)

export default function ContactRoute() {
  const data = useRouteData()
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
            <textarea name="body" id="contact-body" />
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
