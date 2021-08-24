import * as React from 'react'

function EmojiHappyIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8.75 4.75h6.5a4 4 0 014 4v6.5a4 4 0 01-4 4h-6.5a4 4 0 01-4-4v-6.5a4 4 0 014-4z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7.75 12.75S9 15.25 12 15.25s4.25-2.5 4.25-2.5"
      />
      <circle cx={14} cy={10} r={1} fill="currentColor" />
      <circle cx={10} cy={10} r={1} fill="currentColor" />
    </svg>
  )
}

export {EmojiHappyIcon}
