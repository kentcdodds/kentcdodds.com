import * as React from 'react'
import {useRouteData, usePendingFormSubmit} from '@remix-run/react'
import type {Loader, Action} from '@remix-run/data'
import {json, redirect} from '@remix-run/data'

export const action: Action = ({session}) => {
  session.set('success', 'true')
  return redirect('/contact')
}

export const loader: Loader = ({session}) => {
  return json({success: session.get('success') === 'true'})
}

export default function ContactRoute() {
  console.log(useRouteData())
  console.log(usePendingFormSubmit())
  return (
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
  )
}
