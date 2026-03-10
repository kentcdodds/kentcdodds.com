export function hasModernFeatureSet(): boolean {
	try {
		const supportsToSorted =
			typeof (Array.prototype as any).toSorted === 'function'
		const supportsURLCanParse =
			typeof URL !== 'undefined' &&
			'canParse' in URL &&
			typeof (URL as any).canParse === 'function'
		const supportsCSSHas =
			typeof CSS !== 'undefined' &&
			typeof CSS.supports === 'function' &&
			CSS.supports('selector(:has(*))')

		return Boolean(supportsToSorted && supportsURLCanParse && supportsCSSHas)
	} catch {
		return false
	}
}
