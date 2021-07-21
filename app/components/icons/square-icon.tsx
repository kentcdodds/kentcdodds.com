import * as React from 'react'

function SquareIcon({size = 24}: {size?: number}) {
  return (
    <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
      <rect
        width="12.5"
        height="12.5"
        x="5.75"
        y="5.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        rx="1"
      />
    </svg>
  )
}

export {SquareIcon}
