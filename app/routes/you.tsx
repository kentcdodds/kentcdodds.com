import type {Loader} from '@remix-run/data'
import {json} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import * as React from 'react'
import {Outlet} from 'react-router'
import {requireCustomer} from '../utils/session.server'

export const loader: Loader = ({request}) => {
  return requireCustomer(request)(customer => {
    return json(customer)
  })
}

function YouScreen() {
  const data = useRouteData()
  return (
    <div>
      <h1>User: {data.sessionUser.email}</h1>
      <div>Team: {data.user.team}</div>
      <Outlet />
    </div>
  )
}

export default YouScreen
