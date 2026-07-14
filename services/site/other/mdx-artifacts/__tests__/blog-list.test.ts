import { expect, test } from 'vitest'
import { getLocalBlogMdxListItemsUncached } from '#app/utils/mdx.server.ts'

test('blog list excludes non-post README files', async () => {
	const posts = await getLocalBlogMdxListItemsUncached()

	expect(posts.some((post) => /^readme$/i.test(post.slug))).toBe(false)
})
