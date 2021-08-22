import * as React from 'react'

function BookIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M19.25 15.25v-9.5a1 1 0 00-1-1H6.75a2 2 0 00-2 2v10"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.25 15.25H6.75a2 2 0 100 4h12.5v-4z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export {BookIcon}
