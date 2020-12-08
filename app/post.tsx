import * as React from 'react'
import {Outlet} from 'react-router-dom'
import {Header} from './components'

function Post() {
  return (
    <div>
      <Header />
      <Outlet />
    </div>
  )
}

export default Post
