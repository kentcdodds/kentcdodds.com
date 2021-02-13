import * as React from 'react'
import {Outlet} from 'react-router'
import {Link} from 'react-router-dom'

function IndexRoute() {
  return (
    <div>
      INDEX
      <Link to="/contact">Contact Kent</Link>
      <Outlet />
    </div>
  )
}

export default IndexRoute
