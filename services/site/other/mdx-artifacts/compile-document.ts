import { type MdxPage } from '#app/types.ts'
import {
	compileMdx,
	compileMdxEsm,
} from '#app/utils/compile-mdx.server.ts'
import { resolveGitHubMdxFromDirList } from '#app/utils/github-mdx-resolve.server.ts'
import { type MdxArtifactDocument } from '../../types/mdx-artifacts.ts'
import { readLocalMdxFiles, readLocalMdxParentDirList } from './local-content.ts'
import { withRetry } from './retry.ts'

export async function compileMdxArtifactDocument({
	contentDir,
	slug,
}: {
	contentDir: 'blog' | 'pages'
	slug: string
}): Promise<MdxArtifactDocument> {
	const download = await readLocalMdxFiles(contentDir, slug)
	if (!download) {
		throw new Error(`Missing local MDX content for ${contentDir}/${slug}`)
	}

	const parentDirList = await readLocalMdxParentDirList(contentDir)
	const githubResolvable = resolveGitHubMdxFromDirList(
		`${contentDir}/${slug}`,
		parentDirList,
	)

	const label = `${contentDir}/${slug}`
	const [iifeCompiled, esmCompiled] = await Promise.all([
		withRetry({
			label: `${label} (iife)`,
			fn: () => compileMdx<MdxPage['frontmatter']>(slug, download.files),
		}),
		withRetry({
			label: `${label} (esm)`,
			fn: () => compileMdxEsm<MdxPage['frontmatter']>(slug, download.files),
		}),
	])

	if (!iifeCompiled || !esmCompiled) {
		throw new Error(`Failed to compile ${contentDir}/${slug}`)
	}

	const { enrichCompiledMdxPage } = await import('#app/utils/mdx.server.ts')
	const enriched = await enrichCompiledMdxPage({
		slug,
		entry: download.entry,
		compiledPage: iifeCompiled,
	})

	return {
		contentDir,
		slug,
		code: enriched.code,
		esm: esmCompiled.code,
		githubResolvable,
		frontmatter: enriched.frontmatter,
		readTime: enriched.readTime,
		dateDisplay: enriched.dateDisplay,
		editLink: enriched.editLink,
	}
}
