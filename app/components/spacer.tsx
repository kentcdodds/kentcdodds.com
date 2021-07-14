import * as React from 'react'

export interface SpacerProps {
  size: keyof typeof spacerSizes
}

const spacerSizes = {
  smallest: 'h-12',
  smaller: 'h-24', // 96
  small: 'h-36', // 144
  medium: 'h-48', // 200
  large: 'h-64', // 250
}

function Spacer({size}: SpacerProps) {
  return <div className={spacerSizes[size]} />
}

export {Spacer}
