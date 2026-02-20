import { type HeadersFunction } from 'react-router'

export const headers: HeadersFunction = ({ parentHeaders }) => parentHeaders

export default function NoCallSelected() {
	return <div>Select a call</div>
}
