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

test('converts JSX attribute expressions into node prop values', async () => {
	const document = await compileMdxRemoteDocumentFromSource({
		slug: 'jsx-attribute',
		source: `<Themed dark={<p>Dark theme</p>} light={<p>Light theme</p>} />`,
		frontmatter: {
			title: 'JSX attributes',
		},
		allowedComponentNames: mdxRemoteComponentAllowlist,
	})

	expect(document.root.children[0]).toMatchObject({
		type: 'element',
		name: 'Themed',
		props: {
			dark: {
				type: 'node',
				value: {
					type: 'element',
					name: 'p',
					children: [{ type: 'text', value: 'Dark theme' }],
				},
			},
		},
	})
})

test('converts arrow-function expression children into lambda nodes', async () => {
	const document = await compileMdxRemoteDocumentFromSource({
		slug: 'lambda-children',
		source: `<OptionalUser>{(maybeUser) => maybeUser ? <p>Hello {maybeUser.firstName}</p> : <p>Hello visitor</p>}</OptionalUser>`,
		frontmatter: {
			title: 'Lambda children',
		},
		allowedComponentNames: mdxRemoteComponentAllowlist,
	})

	expect(document.root.children[0]).toMatchObject({
		type: 'element',
		name: 'OptionalUser',
		children: [
			{
				type: 'lambda',
				parameter: 'maybeUser',
				body: {
					kind: 'conditional',
					test: 'maybeUser',
				},
			},
		],
	})
})

test('converts object expression props without runtime parsing', async () => {
	const document = await compileMdxRemoteDocumentFromSource({
		slug: 'object-props',
		source: `<img style={{ aspectRatio: '1/1', opacity: 0.5 }} />`,
		frontmatter: {
			title: 'Object props',
		},
		allowedComponentNames: mdxRemoteComponentAllowlist,
	})

	expect(document.root.children[0]).toMatchObject({
		type: 'element',
		name: 'img',
		props: {
			style: {
				aspectRatio: '1/1',
				opacity: 0.5,
			},
		},
	})
})
