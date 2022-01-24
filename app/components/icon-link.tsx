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
      } text-primary focus:outline-none hover:text-team-current focus:text-team-current`}
      ref={ref}
    >
      {props.children}
    </a>
  )
})

export {IconLink}
