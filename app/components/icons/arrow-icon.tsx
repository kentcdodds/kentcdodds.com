import clsx from 'clsx'
import * as React from 'react'

export interface ArrowIconProps {
  direction: 'up' | 'right' | 'down' | 'left' | 'top-right'
  size?: number
}

export const rotationMap = {
  up: 'rotate-180',
  right: '-rotate-90',
  down: 'rotate-0',
  left: 'rotate-90',
  'top-right': '-rotate-135',
}

function ArrowIcon({direction, size = 32}: ArrowIconProps) {
  return (
    <svg
      className={clsx('transform', rotationMap[direction])}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.101 5.5V23.1094L9.40108 17.4095L8.14807 18.6619L15.9862 26.5L23.852 18.6342L22.5996 17.3817L16.8725 23.1094V5.5H15.101Z"
        fill="currentColor"
      />
    </svg>
  )
}

export {ArrowIcon}
