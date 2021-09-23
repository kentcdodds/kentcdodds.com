import * as React from 'react'

function DribbbleIcon({
  size = 24,
  title = 'Dribbble',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <title>{title}</title>
      <path
        d="M19.25 12a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0zM8.271 6.5c2.787 1.6 6.678 4.66 8.879 10M16 6.39C14.357 8.374 10.69 11.71 5 11M10.688 19s.812-6.5 8.03-8.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export {DribbbleIcon}
