import { formatDate } from '#app/utils/misc.ts'

type HeapSnapshotModules = {
	fs: {
		promises: {
			readFile: (path: string) => Promise<Uint8Array>
		}
	}
	os: { tmpdir: () => string }
	path: {
		join: (...parts: Array<string>) => string
		basename: (path: string) => string
	}
	v8: {
		writeHeapSnapshot: (path: string) => string
	}
}

const HEAPSNAPSHOT_UNAVAILABLE_ERROR = 'HEAPSNAPSHOT_UNAVAILABLE'

async function loadHeapSnapshotModules(): Promise<HeapSnapshotModules> {
	try {
		const [fs, os, path, v8] = await Promise.all([
			import('node:fs'),
			import('node:os'),
			import('node:path'),
			import('node:v8'),
		])
		return { fs, os, path, v8 }
	} catch (error) {
		throw new Error(HEAPSNAPSHOT_UNAVAILABLE_ERROR, { cause: error })
	}
}

export async function createHeapSnapshot({
	host,
	now = new Date(),
	loadModules = loadHeapSnapshotModules,
}: {
	host: string
	now?: Date
	loadModules?: () => Promise<HeapSnapshotModules>
}) {
	const { fs, os, path, v8 } = await loadModules()
	const filepath = path.join(
		os.tmpdir(),
		`${host}-${formatDate(now, 'yyyy-MM-dd HH_mm_ss_SSS')}.heapsnapshot`,
	)
	const snapshotPath = v8.writeHeapSnapshot(filepath)
	if (!snapshotPath) {
		throw new Error('HEAPSNAPSHOT_WRITE_FAILED')
	}
	const snapshot = await fs.promises.readFile(snapshotPath)

	return {
		bytes: snapshot,
		filename: path.basename(snapshotPath),
	}
}

export function isHeapSnapshotUnavailableError(error: unknown) {
	return (
		error instanceof Error && error.message === HEAPSNAPSHOT_UNAVAILABLE_ERROR
	)
}
