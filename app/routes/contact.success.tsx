import {json, useRouteData} from 'remix'
import type {LoaderFunction} from 'remix'
import * as React from 'react'
import {rootStorage} from '../utils/session.server'
import {contactDataSessionKey} from '../utils/contact'
import type {ContactData} from '../utils/contact'

export const loader: LoaderFunction = async ({request}) => {
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const contactData = session.get(contactDataSessionKey) as ContactData
  return json(contactData, {
    headers: {
      'Set-Cookie': await rootStorage.commitSession(session),
    },
  })
}

function ContactSuccess() {
  const data = useRouteData<ContactData>()
  return (
    <div>
      Hooray
      <div>
        <p>Your message has been sent to Kent.</p>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  )
}

export default ContactSuccess
