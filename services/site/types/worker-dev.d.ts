declare const __MDX_DEV_CACHE_ROOT__: string

declare module 'virtual:mdx-dev-manifest' {
	import type { MdxDevManifestModule } from '../other/vite-plugins/mdx-dev-manifest.ts'
	const manifest: MdxDevManifestModule
	export default manifest
}
