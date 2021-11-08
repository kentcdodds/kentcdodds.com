import * as React from 'react'

function ChevronUpIcon({
  className,
  title,
}: {
  className?: string
  title?: string
}) {
  return (
    <svg
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M15.25 14.25L12 10.75L8.75 14.25"
      />
    </svg>
  )
}

export {ChevronUpIcon}
