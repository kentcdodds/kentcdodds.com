import {
	createHeapSnapshot,
	isHeapSnapshotUnavailableError,
} from '#app/utils/heapsnapshot.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/heapsnapshot'

export async function loader({ request }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const host =
		request.headers.get('X-Forwarded-Host') ?? request.headers.get('host')
	if (!host) {
		throw new Response('Host header is required', { status: 400 })
	}

	try {
		const { bytes, filename } = await createHeapSnapshot({ host })
		const snapshotSize = bytes.byteLength
		const responseBody =
			bytes.buffer instanceof ArrayBuffer
				? bytes.buffer.slice(
						bytes.byteOffset,
						bytes.byteOffset + bytes.byteLength,
					)
				: Uint8Array.from(bytes).buffer

		return new Response(responseBody, {
			status: 200,
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Content-Length': String(snapshotSize),
			},
		})
	} catch (error) {
		if (isHeapSnapshotUnavailableError(error)) {
			throw new Response('Heap snapshot is unavailable in this runtime', {
				status: 501,
			})
		}
		throw error
	}
}
