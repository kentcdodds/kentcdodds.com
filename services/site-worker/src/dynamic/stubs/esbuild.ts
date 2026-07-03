function unavailable(): never {
	throw new Error('esbuild is not available in the Cloudflare Workers runtime')
}

export function build() {
	unavailable()
}

export function transform() {
	unavailable()
}

export default { build, transform }
