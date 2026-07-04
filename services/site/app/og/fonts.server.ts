type AssetsBinding = {
	fetch(request: Request): Response | Promise<Response>
}

let fontsPromise: Promise<
	Array<{
		name: string
		data: ArrayBuffer
		weight: 400 | 500
		style: 'normal'
	}>
> | null = null

async function loadFontFromAssets(
	path: string,
	assets?: AssetsBinding,
	origin = 'https://kentcdodds.com',
) {
	if (assets) {
		const response = await assets.fetch(new Request(new URL(path, origin)))
		if (!response.ok) {
			throw new Error(`Failed to load font asset ${path} (${response.status})`)
		}
		return new Uint8Array(await response.arrayBuffer())
	}

	const response = await fetch(new URL(path, origin))
	if (!response.ok) {
		throw new Error(`Failed to load font ${path} (${response.status})`)
	}
	return new Uint8Array(await response.arrayBuffer())
}

export function getOgFonts(
	assets?: AssetsBinding,
	origin?: string,
) {
	if (!fontsPromise) {
		fontsPromise = (async () => {
			const [regular, medium] = await Promise.all([
				loadFontFromAssets('/fonts/Matter-Regular.woff', assets, origin),
				loadFontFromAssets('/fonts/Matter-Medium.woff', assets, origin),
			])
			return [
				{
					name: 'Matter',
					data: regular.buffer.slice(
						regular.byteOffset,
						regular.byteOffset + regular.byteLength,
					) as ArrayBuffer,
					weight: 400 as const,
					style: 'normal' as const,
				},
				{
					name: 'Matter',
					data: medium.buffer.slice(
						medium.byteOffset,
						medium.byteOffset + medium.byteLength,
					) as ArrayBuffer,
					weight: 500 as const,
					style: 'normal' as const,
				},
			]
		})().catch((error) => {
			fontsPromise = null
			throw error
		})
	}
	return fontsPromise
}

export function clearOgFontsCacheForTests() {
	fontsPromise = null
}
