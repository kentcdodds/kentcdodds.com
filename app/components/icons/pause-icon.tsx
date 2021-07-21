import * as React from 'react'

function PauseIcon({size = 24}: {size?: number}) {
  return (
    <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M15.25 6.75V17.25"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M8.75 6.75V17.25"
      />
    </svg>
  )
}

export {PauseIcon}
