import * as React from 'react'

function LaptopIcon({size = 24}: {size?: number} = {}) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
      <path
        d="M5.75 5.75a1 1 0 011-1h10.5a1 1 0 011 1v8.5H5.75v-8.5zM18.25 14.5l.746 3.544a1 1 0 01-.979 1.206H5.982a1 1 0 01-.978-1.206L5.75 14.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default LaptopIcon
