/**
 * Subscribe to MediaQueryList "change" in a way that works on older browsers.
 *
 * Safari < 14 (and some other older engines) expose only the legacy
 * `addListener` / `removeListener` API on MediaQueryList — calling
 * `addEventListener` throws `TypeError: … is not a function` (KCD-10J).
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

	// Legacy MediaQueryList (Safari < 14)
	mediaQuery.addListener(listener)
	return () => {
		mediaQuery.removeListener(listener)
	}
}

export { subscribeMediaQuery }
