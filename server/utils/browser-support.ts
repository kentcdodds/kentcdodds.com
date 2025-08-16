export function isModernBrowserByUA(
	userAgentString: string | undefined | null,
): boolean {
	if (!userAgentString) return true
	const ua = String(userAgentString).toLowerCase()

	if (ua.includes('msie') || ua.includes('trident/')) {
		return false
	}

	function getMajor(re: RegExp): number | null {
		const match = String(userAgentString).match(re)
		if (!match) return null
		const group = match[1]
		if (typeof group !== 'string') return null
		const major = Number.parseInt(group, 10)
		return Number.isFinite(major) ? major : null
	}

	const chromeMajor = getMajor(/(?:chrome|crios)\/(\d+)/i)
	const edgeMajor = getMajor(/(?:edg|edge|edgios)\/(\d+)/i)
	const firefoxMajor = getMajor(/(?:firefox|fxios)\/(\d+)/i)
	const operaMajor = getMajor(/(?:opr|opios)\/(\d+)/i)
	const samsungMajor = getMajor(/samsungbrowser\/(\d+)/i)
	const safariMajor = getMajor(/version\/(\d+)/i)

	const MIN = {
		chrome: 100,
		edge: 100,
		firefox: 100,
		opera: 86,
		samsung: 17,
		safari: 15,
	}

	if (samsungMajor != null) {
		return samsungMajor >= MIN.samsung
	}
	if (firefoxMajor != null) {
		return firefoxMajor >= MIN.firefox
	}
	if (edgeMajor != null) {
		return edgeMajor >= MIN.edge
	}
	if (operaMajor != null) {
		if (chromeMajor != null) return chromeMajor >= MIN.chrome
		return operaMajor >= MIN.opera
	}
	if (chromeMajor != null) {
		return chromeMajor >= MIN.chrome
	}
	if (safariMajor != null) {
		return safariMajor >= MIN.safari
	}
	return true
}
