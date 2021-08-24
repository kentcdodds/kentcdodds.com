import * as React from 'react'

function TrophyIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M7.75 4.75h8.5V11a4.25 4.25 0 01-8.5 0V4.75zM16.5 6.75h.104a2.646 2.646 0 01.904 5.133l-1.008.367M7.5 6.75h-.104a2.646 2.646 0 00-.904 5.133l1.008.367M12 15.5V19M8.75 19.25h6.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export {TrophyIcon}
