import * as React from 'react'
import {Outlet} from 'react-router-dom'

export default function CallInPodcastScreen() {
  return (
    <div>
      <h1>Welcome to the Call Kent Podcast</h1>
      <hr />
      <Outlet />
    </div>
  )
}
