import { type MdxPage } from '#app/types.ts'
import {
	compileMdxEsm,
	compileMdxUnqueued,
} from '#app/utils/compile-mdx.server.ts'
import { type MdxArtifactDocument } from '../../types/mdx-artifacts.ts'
import { readLocalMdxFiles } from './local-content.ts'
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

	const label = `${contentDir}/${slug}`
	const [iifeCompiled, esmCompiled] = await Promise.all([
		withRetry({
			label: `${label} (iife)`,
			fn: () =>
				compileMdxUnqueued<MdxPage['frontmatter']>(slug, download.files),
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
		frontmatter: enriched.frontmatter,
		readTime: enriched.readTime,
		dateDisplay: enriched.dateDisplay,
		editLink: enriched.editLink,
	}
}
