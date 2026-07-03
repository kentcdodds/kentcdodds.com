function unavailable(): never {
	throw new Error('@mdx-js/esbuild is not available in the Cloudflare Workers runtime')
}

export default function mdxPlugin() {
	unavailable()
}
