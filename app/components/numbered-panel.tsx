import * as React from 'react'
import {H6, Paragraph} from './typography'

interface NumberedPanelProps {
  number: number
  caption: string
  description: string
}

function NumberedPanel({number, caption, description}: NumberedPanelProps) {
  // Note, we can move the counters to pure css if needed, but I'm not sure if it adds anything
  return (
    <li>
      <H6 as="h3" className="relative mb-6 lg:mb-8">
        <span className="block mb-4 lg:absolute lg:-left-16 lg:mb-0">
          {number.toString().padStart(2, '0')}.
        </span>
        {caption}
      </H6>
      <Paragraph>{description}</Paragraph>
    </li>
  )
}

export {NumberedPanel}
