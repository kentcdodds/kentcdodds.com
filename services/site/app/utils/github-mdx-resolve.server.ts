import nodePath from 'node:path'
import { getGitHubContentPath } from '#app/utils/github-content-paths.server.ts'

export type GitHubDirListItem = {
	name: string
	type: 'file' | 'dir'
}

function matchesMdxExtension(name: string) {
	return /\.(mdx|md)$/i.test(name)
}

/**
 * Pure mirror of `downloadMdxFileOrDirectory` path matching against a parent
 * directory listing (no network). Used for worker/prod parity when GitHub path
 * parsing treats dotted slugs like `foo.com` as `foo` + ext `.com`.
 */
export function resolveGitHubMdxFromDirList(
	relativeMdxFileOrDirectory: string,
	parentDirList: Array<GitHubDirListItem>,
): boolean {
	const mdxFileOrDirectory = getGitHubContentPath(relativeMdxFileOrDirectory)
	const basename = nodePath.basename(mdxFileOrDirectory)
	const mdxFileWithoutExt = nodePath.parse(mdxFileOrDirectory).name
	const requestedExt = nodePath.extname(basename).toLowerCase()
	const isExplicitFileRequest =
		requestedExt === '.mdx' || requestedExt === '.md'

	if (isExplicitFileRequest) {
		return parentDirList.some(
			(item) => item.type === 'file' && item.name === basename,
		)
	}

	const exactFiles = parentDirList.filter(
		(item) =>
			item.type === 'file' &&
			nodePath.parse(item.name).name === mdxFileWithoutExt &&
			matchesMdxExtension(item.name),
	)
	if (exactFiles.length > 0) return true

	return parentDirList.some(
		(item) => item.type === 'dir' && item.name === mdxFileWithoutExt,
	)
}
