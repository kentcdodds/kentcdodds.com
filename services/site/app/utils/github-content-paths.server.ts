/**
 * Path prefix for content in the GitHub repo.
 * Used when fetching MDX, data files, etc. via the GitHub API.
 * Moved from content/ to services/site/content/ in monorepo refactor.
 */
export const GITHUB_CONTENT_PATH = 'services/site/content'

/** Prefix to strip when resolving GitHub API paths to local paths (relative to services/site) */
const GITHUB_PATH_TO_LOCAL_PREFIX =
	GITHUB_CONTENT_PATH.replace(/\/content$/, '') + '/'

export function getGitHubContentPath(relativePath: string): string {
	return `${GITHUB_CONTENT_PATH}/${relativePath}`
}

/**
 * For mocks: convert GitHub API path to path relative to services/site directory.
 * e.g. "services/site/content/blog/foo.mdx" -> "content/blog/foo.mdx"
 */
export function toLocalContentPath(githubPath: string): string {
	return githubPath.replace(GITHUB_PATH_TO_LOCAL_PREFIX, '')
}
