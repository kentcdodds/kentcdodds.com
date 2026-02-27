import {
	type MdxRemoteDocument,
	type MdxRemoteRootNode,
} from '#app/mdx-remote/compiler/types.ts'

type MdxRemoteCompilerPluginContext<Frontmatter extends Record<string, unknown>> = {
	slug: string
	frontmatter: Frontmatter
	root: MdxRemoteRootNode
	allowedComponentNames: ReadonlySet<string>
}

type MdxRemoteCompilerPlugin<Frontmatter extends Record<string, unknown>> = (
	context: MdxRemoteCompilerPluginContext<Frontmatter>,
) => void | Promise<void>

async function runMdxRemoteCompilerPlugins<Frontmatter extends Record<string, unknown>>({
	document,
	plugins,
	allowedComponentNames,
}: {
	document: MdxRemoteDocument<Frontmatter>
	plugins: Array<MdxRemoteCompilerPlugin<Frontmatter>>
	allowedComponentNames: ReadonlySet<string>
}) {
	for (const plugin of plugins) {
		await plugin({
			slug: document.slug,
			frontmatter: document.frontmatter,
			root: document.root,
			allowedComponentNames,
		})
	}
}

export { runMdxRemoteCompilerPlugins }
export type { MdxRemoteCompilerPlugin, MdxRemoteCompilerPluginContext }
