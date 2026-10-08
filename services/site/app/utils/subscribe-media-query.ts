/**
 * Subscribe to MediaQueryList "change" in a way that works on older browsers.
 *
 * Safari < 14 (and some other older engines) expose only the legacy
 * `addListener` / `removeListener` API on MediaQueryList — calling
 * `addEventListener` throws `TypeError: … is not a function` (KCD-10J).
 *
 * Some client environments expose a MediaQueryList-like object with neither
 * listener API. Skip subscription and return a no-op cleanup so callers can
 * still read the initial `.matches` value without crashing the tree (KCD-10K).
 */
function subscribeMediaQuery(
	mediaQuery: MediaQueryList,
	listener: (event: MediaQueryListEvent) => void,
): () => void {
	if (typeof mediaQuery.addEventListener === 'function') {
		mediaQuery.addEventListener('change', listener)
		return () => {
			mediaQuery.removeEventListener('change', listener)
		}
	}

	if (typeof mediaQuery.addListener === 'function') {
		// Legacy MediaQueryList (Safari < 14)
		mediaQuery.addListener(listener)
		return () => {
			mediaQuery.removeListener(listener)
		}
	}

	return () => {}
}

export { subscribeMediaQuery }
