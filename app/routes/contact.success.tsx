import {useRouteData} from '@remix-run/react'
import * as React from 'react'
import {KCDLoader} from 'types'
import {sendSessionValue} from '../utils/load-session'

export const loader: KCDLoader = (...args) =>
  sendSessionValue({error: null})(...args)

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
