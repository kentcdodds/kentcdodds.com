import type {Loader} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import * as React from 'react'
import {sendSessionValue} from '../utils/load-session'

export const loader: Loader = sendSessionValue({result: null})

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
