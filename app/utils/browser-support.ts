export function isModernBrowserByUA(userAgentString: string | undefined | null): boolean {
	if (!userAgentString) return true
	const ua = userAgentString.toLowerCase()

	// Block all versions of Internet Explorer
	if (ua.includes('msie') || ua.includes('trident/')) {
		return false
	}

	// Helper to extract the first capture group as an integer
	function getMajor(re: RegExp): number | null {
		const match = userAgentString.match(re)
		if (!match) return null
		const major = parseInt(match[1], 10)
		return Number.isFinite(major) ? major : null
	}

	// Detect major versions for popular browsers / engines
	const chromeMajor = getMajor(/(?:chrome|crios)\/(\d+)/i)
	const edgeMajor = getMajor(/(?:edg|edge|edgios)\/(\d+)/i)
	const firefoxMajor = getMajor(/(?:firefox|fxios)\/(\d+)/i)
	const operaMajor = getMajor(/(?:opr|opios)\/(\d+)/i)
	const samsungMajor = getMajor(/samsungbrowser\/(\d+)/i)
	const safariMajor = getMajor(/version\/(\d+)/i) // Safari reports Version/x.y

	// iOS WebKit browsers do not report Chrome engine reliably
	const isIOS = /iphone|ipad|ipod/.test(ua)

	// Define minimum supported versions
	const MIN = {
		chrome: 100,
		edge: 100,
		firefox: 100,
		opera: 86, // ~ Chrome 100 timeframe
		samsung: 17,
		safari: 15, // includes iOS Safari
	}

	// Samsung Internet
	if (samsungMajor != null) {
		return samsungMajor >= MIN.samsung
	}

	// Firefox
	if (firefoxMajor != null) {
		return firefoxMajor >= MIN.firefox
	}

	// Edge (Chromium)
	if (edgeMajor != null) {
		return edgeMajor >= MIN.edge
	}

	// Opera
	if (operaMajor != null) {
		// Prefer Chrome engine version if present; otherwise, use Opera version
		if (chromeMajor != null) return chromeMajor >= MIN.chrome
		return operaMajor >= MIN.opera
	}

	// Chrome (or Chromium-based including iOS Chrome reports as CriOS)
	if (chromeMajor != null) {
		return chromeMajor >= MIN.chrome
	}

	// Safari (desktop and iOS Safari report Version/x)
	if (safariMajor != null) {
		return safariMajor >= MIN.safari
	}

	// Unknown: allow by default to avoid dropping legitimate reports
	return true
}