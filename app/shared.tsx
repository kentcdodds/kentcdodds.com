import * as React from 'react'
import {Link} from 'react-router-dom'

const useSSRLayoutEffect =
  typeof window === 'undefined' ? () => {} : React.useLayoutEffect

type AnchorProps = React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>

function AnchorOrLink(props: AnchorProps) {
  const {href = '', ...rest} = props
  if (href.startsWith('http')) {
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    return <a {...props} />
  } else {
    // @ts-expect-error I'm not sure what to do about extra props other than to forward them
    return <Link to={href} {...rest} />
  }
}

export {useSSRLayoutEffect, AnchorOrLink}
