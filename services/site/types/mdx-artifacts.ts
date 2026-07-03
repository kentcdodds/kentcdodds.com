import type calculateReadingTime from 'reading-time'
import type { MdxListItem } from '#app/types.ts'

export type MdxDirListEntry = {
	name: string
	slug: string
	type: 'file' | 'dir'
}

export type MdxArtifactDocument = {
	contentDir: string
	slug: string
	code: string
	esm: string
	/** False when prod GitHub path resolution would not find this slug. */
	githubResolvable: boolean
	frontmatter: MdxListItem['frontmatter']
	readTime?: ReturnType<typeof calculateReadingTime>
	dateDisplay?: string
	editLink: string
}

export type MdxArtifactBundle = {
	schemaVersion: 1
	version: string
	generatedAt: string
	documents: Record<string, MdxArtifactDocument>
	blogList: Array<MdxListItem>
	dirLists: {
		blog: Array<MdxDirListEntry>
		pages: Array<MdxDirListEntry>
	}
	dataFiles: Record<string, string>
}
