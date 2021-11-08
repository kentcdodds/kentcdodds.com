import * as React from 'react'

function ChevronDownIcon({
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
        d="M15.25 10.75L12 14.25L8.75 10.75"
      />
    </svg>
  )
}

export {ChevronDownIcon}
