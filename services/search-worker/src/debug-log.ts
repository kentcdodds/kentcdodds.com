import { appendFileSync } from 'node:fs'

export function writeDebugLog({
	hypothesisId,
	location,
	message,
	data,
}: {
	hypothesisId: string
	location: string
	message: string
	data: Record<string, unknown>
}) {
	try {
		appendFileSync(
			'/opt/cursor/logs/debug.log',
			JSON.stringify({
				hypothesisId,
				location,
				message,
				data,
				timestamp: Date.now(),
			}) + '\n',
		)
	} catch {}
}
