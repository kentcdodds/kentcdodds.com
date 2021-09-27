import * as React from 'react'

function TwitchIcon({
  size = 24,
  title = 'Twitch',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <path
        d="M18.25 4.75H5.75a1 1 0 00-1 1v9.5a1 1 0 001 1h2v3l3.25-3h6L19.25 14V5.75a1 1 0 00-1-1zM15.25 9.75v2.5M11.25 9.75v2.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export {TwitchIcon}
