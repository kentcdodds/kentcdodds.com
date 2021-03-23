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
  console.log(data)
  return (
    <div>
      YOU!
      <Outlet />
    </div>
  )
}

export default YouScreen
