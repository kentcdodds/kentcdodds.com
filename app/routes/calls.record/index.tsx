import * as React from 'react'
import type {HeadersFunction} from 'remix'

export const headers: HeadersFunction = ({parentHeaders}) => parentHeaders

export default function NoCallSelected() {
  return <div>Select a call</div>
}
