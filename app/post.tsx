import * as React from 'react'
import {useRouteData} from '@remix-run/react'
import {Outlet} from 'react-router-dom'
import {Header} from './components'

function Post() {
  const data = useRouteData()
  console.log({data})
  return (
    <div>
      <Header />
      <Outlet />
    </div>
  )
}

export default Post
