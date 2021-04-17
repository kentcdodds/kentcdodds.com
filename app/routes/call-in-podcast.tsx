import * as React from 'react'
import {Outlet} from 'react-router'

export default function CallInPodcastScreen() {
  return (
    <div>
      <h1>Call in Podcast with Kent</h1>
      <hr />
      <Outlet />
    </div>
  )
}
