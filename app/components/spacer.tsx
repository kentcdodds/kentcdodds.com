import * as React from 'react'

export interface SpacerProps {
  size: 'medium' | 'large'
}

const spacerSizes = {
  medium: 'h-48',
  large: 'h-64',
}

function Spacer({size}: SpacerProps) {
  return <div className={spacerSizes[size]} />
}

export {Spacer}
