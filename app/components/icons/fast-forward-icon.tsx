import * as React from 'react'

function FastForwardIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 15.86l-3.25 2.39V5.75L8 8.14M19.25 12l-8.5-6.25v12.5l8.5-6.25z"
      />
    </svg>
  )
}

export {FastForwardIcon}
