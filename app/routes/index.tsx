import * as React from 'react'
import {Outlet} from 'react-router'
import {Link} from 'react-router-dom'

function IndexRoute() {
  return (
    <div>
      <nav>
        <ul>
          <li>
            <Link to="/blog">Blog</Link>
          </li>
          <li>
            <Link to="/about">About Kent</Link>
          </li>
          <li>
            <Link to="/call">Call Kent</Link>
          </li>
          <li>
            <Link to="/contact">Contact Kent</Link>
          </li>
          <li>
            <Link to="/workshops">Workshops</Link>
          </li>
          <li>
            <Link to="/discord">Discord</Link>
          </li>
          <li>
            <Link to="/login">Login</Link>
          </li>
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}

export default IndexRoute
