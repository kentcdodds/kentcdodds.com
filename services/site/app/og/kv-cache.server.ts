export function encodePngForKv(png: Uint8Array) {
	let binary = ''
	for (let i = 0; i < png.length; i++) {
		binary += String.fromCharCode(png[i]!)
	}
	return btoa(binary)
}

export function decodePngFromKv(cached: ArrayBuffer | string) {
	if (cached instanceof ArrayBuffer) {
		return new Uint8Array(cached)
	}

	try {
		return Uint8Array.from(atob(cached), (char) => char.charCodeAt(0))
	} catch {
		// Miniflare can return raw latin1 when ArrayBuffer values were stored.
		return Uint8Array.from(cached, (char) => char.charCodeAt(0))
	}
}
