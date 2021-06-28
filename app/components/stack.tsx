import * as React from 'react'
import {Spacer, SpacerProps} from './spacer'

interface StackProps {
  children: React.ReactNode | Array<React.ReactNode>
  space: SpacerProps['size']
}

function Stack({children, space}: StackProps) {
  return React.Children.map(children, (child, idx) => [
    child,
    <Spacer key={idx} size={space} />, // idx as key isn't optimal, but Spacers never change, so it's okay
  ])
    ?.flat()
    .slice(0, -1)
}

export {Stack}
