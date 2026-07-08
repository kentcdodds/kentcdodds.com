export function encodeBase64Url(bytes: Uint8Array) {
	let binary = ''
	for (const byte of bytes) {
		binary += String.fromCharCode(byte)
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function decodeBase64Url(value: string) {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
	const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
	const binary = atob(`${normalized}${padding}`)
	const bytes = new Uint8Array(binary.length)
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index)
	}
	return bytes
}

export function encodeJsonBase64Url(value: unknown) {
	return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)))
}

export function decodeJsonBase64Url<T>(value: string): T {
	const bytes = decodeBase64Url(value)
	const json = new TextDecoder().decode(bytes)
	return JSON.parse(json) as T
}
