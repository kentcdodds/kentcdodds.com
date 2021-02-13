import {json, Loader} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import * as React from 'react'
import {getSession} from '../session-storage'

export const loader: Loader = async ({request}) => {
  const session = await getSession(request.headers.get('Cookie') ?? undefined)
  return json({result: session.get('result')})
}

function ContactSuccess() {
  const data = useRouteData()
  return (
    <div>
      Hooray
      <div>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  )
}

export default ContactSuccess
