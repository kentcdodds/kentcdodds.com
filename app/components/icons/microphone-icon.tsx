import * as React from 'react'

function MicrophoneIcon({size = 24}: {size?: number}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M8.75 8C8.75 6.20507 10.2051 4.75 12 4.75C13.7949 4.75 15.25 6.20507 15.25 8V11C15.25 12.7949 13.7949 14.25 12 14.25C10.2051 14.25 8.75 12.7949 8.75 11V8Z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5.75 12.75C5.75 12.75 6 17.25 12 17.25C18 17.25 18.25 12.75 18.25 12.75"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12 17.75V19.25"
      />
    </svg>
  )
}

export {MicrophoneIcon}
