import * as React from 'react'
import {Outlet} from 'react-router-dom'
import {Header} from '../components'

export function meta() {
  return {
    title: 'Elaborate',
    description: 'Alright stop. Elaborate and listen...',
  }
}

function Index() {
  return (
    <div>
      <Header />
      <Outlet />
    </div>
  )
}

export default Index
