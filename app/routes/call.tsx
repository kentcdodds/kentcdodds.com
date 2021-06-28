import * as React from 'react'
import {Outlet} from 'react-router-dom'

export default function CallInPodcastScreen() {
  return (
    <div>
      <h2>Welcome to the Call Kent Podcast</h2>
      <hr />
      <Outlet />
    </div>
  )
}
