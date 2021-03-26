import * as React from 'react'
import type {Loader} from '@remix-run/data'
import {json, redirect} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import {confirmUser} from '../../utils/firebase.server'
import {requireUser} from '../../utils/session.server'

export const loader: Loader = ({request}) => {
  return requireUser(request)(async () => {
    const code = new URL(request.url).searchParams.get('oobCode')
    if (!code) return json({error: 'Code required to confirm'})
    await confirmUser(code)
    return redirect('/me')
  })
}

function ConfirmScreen() {
  const data = useRouteData()
  return (
    <div>
      <div>There was an error:</div>
      <div>{data.error}</div>
    </div>
  )
}

export default ConfirmScreen
