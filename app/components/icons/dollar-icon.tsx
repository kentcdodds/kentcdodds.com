import * as React from 'react'

function DollarIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="7.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M14.25 8.75H11.375C10.4775 8.75 9.75 9.47754 9.75 10.375V10.375C9.75 11.2725 10.4775 12 11.375 12H12.625C13.5225 12 14.25 12.7275 14.25 13.625V13.625C14.25 14.5225 13.5225 15.25 12.625 15.25H9.75"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12 7.75V8.25"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12 15.75V16.25"
      />
    </svg>
  )
}

export {DollarIcon}
