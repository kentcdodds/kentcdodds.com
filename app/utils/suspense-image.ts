const MAX_CACHE_ENTRIES = 50

const imgCache = new Map<string, Promise<string>>()

export function imgSrc(src: string) {
	const cached = imgCache.get(src)
	if (cached) return cached

	const promise = preloadImage(src)
	imgCache.set(src, promise)

	// Keep this cache bounded; artwork URLs can be unique per keystroke.
	if (imgCache.size > MAX_CACHE_ENTRIES) {
		const oldestKey = imgCache.keys().next().value
		if (typeof oldestKey === 'string') imgCache.delete(oldestKey)
	}

	return promise
}

function preloadImage(src: string) {
	// SSR-safe: callers should generally only use this in the browser, but guard
	// anyway so we never throw on `new Image()` during server rendering.
	if (typeof Image === 'undefined') return Promise.resolve(src)

	return new Promise<string>((resolve, reject) => {
		const img = new Image()
		img.src = src
		img.onload = () => resolve(src)
		img.onerror = reject
	})
}

