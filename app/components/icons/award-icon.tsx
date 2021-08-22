import * as React from 'react'

function AwardIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M17.25 10a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.75 14.75l-1 4.5 4.25-1.5 4.25 1.5-1-4.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export {AwardIcon}
