import * as React from 'react'

function MugIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M7.25 6.75h-.5a2 2 0 00-2 2v2.5a2 2 0 002 2h.5M19.25 4.75H7.75v9.5a2 2 0 002 2h7.5a2 2 0 002-2v-9.5zM19.25 19.25H4.75"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export {MugIcon}
