import * as React from 'react'
import {Outlet} from 'react-router'

function BlogRoute() {
  return (
    <div>
      BLOG WOOT
      <Outlet />
    </div>
  )
}

export default BlogRoute
