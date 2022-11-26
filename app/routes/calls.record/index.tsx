import type {HeadersFunction} from '@remix-run/node'

export const headers: HeadersFunction = ({parentHeaders}) => parentHeaders

export default function NoCallSelected() {
  return <div>Select a call</div>
}
