import * as React from 'react'

function MailIcon({size = 24}: {size?: number}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M4.75 8.75L12 4.75L19.25 8.75V17.25C19.25 18.3546 18.3546 19.25 17.25 19.25H6.75C5.64543 19.25 4.75 18.3546 4.75 17.25V8.75Z"
        stroke="#141414"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 9L13.25 13.25H10.75L5 9"
        stroke="#141414"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export {MailIcon}
