import { formatDate } from '#app/utils/misc.ts'
import { type Route } from './+types/heapsnapshot'

function isFlyNodeProduction() {
	return (
		typeof process !== 'undefined' &&
		process.release?.name === 'node' &&
		process.env.NODE_ENV === 'production' &&
		Boolean(
			process.env.FLY_APP_NAME &&
			process.env.FLY_REGION &&
			process.env.FLY_MACHINE_ID,
		)
	)
}

export async function loader({ request }: Route.LoaderArgs) {
	if (!isFlyNodeProduction()) {
		throw new Response(
			'Heap snapshots are only available on Fly.io production Node diagnostics.',
			{ status: 501 },
		)
	}

	const [
		fs,
		os,
		path,
		{ PassThrough },
		v8,
		{ createReadableStreamFromReadable },
		{ requireAdminUser },
	] = await Promise.all([
		import('node:fs'),
		import('node:os'),
		import('node:path'),
		import('node:stream'),
		import('node:v8'),
		import('@react-router/node'),
		import('#app/utils/session.server.ts'),
	])

	await requireAdminUser(request)
	const host =
		request.headers.get('X-Forwarded-Host') ?? request.headers.get('host')

	const tempDir = os.tmpdir()
	const filepath = path.join(
		tempDir,
		`${host}-${formatDate(new Date(), 'yyyy-MM-dd HH_mm_ss_SSS')}.heapsnapshot`,
	)

	const snapshotPath = v8.writeHeapSnapshot(filepath)
	if (!snapshotPath) {
		throw new Response('No snapshot saved', { status: 500 })
	}

	const body = new PassThrough()
	const stream = fs.createReadStream(snapshotPath)
	stream.on('open', () => stream.pipe(body))
	stream.on('error', (err) => body.end(err))
	stream.on('end', () => body.end())

	return new Response(createReadableStreamFromReadable(body), {
		status: 200,
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Disposition': `attachment; filename="${path.basename(
				snapshotPath,
			)}"`,
			'Content-Length': (await fs.promises.stat(snapshotPath)).size.toString(),
		},
	})
}
