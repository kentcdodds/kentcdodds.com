import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/router'
import { invariantResponse } from '#app/utils/misc.js'
import { connect, getTransport, requestStorage } from './mcp.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const response = await requestStorage.run(request, async () => {
		const url = new URL(request.url)
		const sessionId = url.searchParams.get('sessionId')
		const transport = await connect(sessionId)
		return transport.handleSSERequest(request)
	})

	return response
}

export async function action({ request }: ActionFunctionArgs) {
	const response = await requestStorage.run(request, async () => {
		const url = new URL(request.url)
		const sessionId = url.searchParams.get('sessionId')
		invariantResponse(sessionId, 'No session ID')

		const transport = await getTransport(sessionId)
		invariantResponse(transport, `No transport for sessionId "${sessionId}"`, {
			status: 404,
		})

		return transport.handlePostMessage(request)
	})

	return response
}
