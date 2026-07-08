export type ColdStartTimingParts = Record<string, number>

export function formatColdStartTiming(parts: ColdStartTimingParts) {
	return Object.entries(parts)
		.map(([key, ms]) => `${key}=${ms.toFixed(1)}`)
		.join(',')
}

export function mergeColdStartTimingHeaders(
	...headers: Array<string | undefined>
) {
	const merged: ColdStartTimingParts = {}
	for (const header of headers) {
		if (!header) continue
		for (const part of header.split(',')) {
			const [key, value] = part.split('=')
			if (!key || !value) continue
			const parsed = Number.parseFloat(value)
			if (Number.isFinite(parsed)) merged[key] = parsed
		}
	}
	return formatColdStartTiming(merged)
}
