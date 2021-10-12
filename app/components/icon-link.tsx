import * as React from 'react'

const IconLink = React.forwardRef<
  HTMLAnchorElement,
  JSX.IntrinsicElements['a']
>(function IconLink(props, ref) {
  return (
    <a
      {...props}
      className={`${
        props.className ?? ''
      } text-primary hover:text-team-current focus:text-team-current focus:outline-none`}
      ref={ref}
    >
      {props.children}
    </a>
  )
})

export {IconLink}
