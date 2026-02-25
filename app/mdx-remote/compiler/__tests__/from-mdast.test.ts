import { expect, test } from 'vitest'
import {
	compileMdxRemoteDocumentFromSource,
} from '#app/mdx-remote/compiler/from-mdast.ts'
import { mdxRemoteComponentAllowlist } from '#app/mdx-remote/component-allowlist.ts'

test('compiles markdown and mdx component syntax from source', async () => {
	const document = await compileMdxRemoteDocumentFromSource({
		slug: 'example',
		source: `
# Heading

Hello **world**

<SubscribeForm formId="newsletter" kitFormId="form" kitTagId="tag" />
		`.trim(),
		frontmatter: {
			title: 'Example',
		},
		allowedComponentNames: mdxRemoteComponentAllowlist,
	})

	expect(document.root.children[0]).toEqual({
		type: 'element',
		name: 'h1',
		children: [{ type: 'text', value: 'Heading' }],
	})

	expect(document.root.children[2]).toMatchObject({
		type: 'element',
		name: 'SubscribeForm',
		props: {
			formId: 'newsletter',
			kitFormId: 'form',
			kitTagId: 'tag',
		},
	})
})

test('captures mdx expression attributes for runtime evaluation', async () => {
	const document = await compileMdxRemoteDocumentFromSource({
		slug: 'expression-attributes',
		source: `<BlogImage imageId={frontmatter.bannerImageId} imgProps={{alt: frontmatter.title}} />`,
		frontmatter: {
			title: 'Example',
		},
		allowedComponentNames: mdxRemoteComponentAllowlist,
	})

	expect(document.root.children[0]).toMatchObject({
		type: 'element',
		name: 'BlogImage',
		props: {
			imageId: {
				type: 'expression',
				value: 'frontmatter.bannerImageId',
			},
		},
	})
})
