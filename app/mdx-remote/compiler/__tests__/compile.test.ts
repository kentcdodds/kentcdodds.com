import { expect, test, vi } from 'vitest'
import { compileMdxRemoteDocument } from '#app/mdx-remote/compiler/compile.ts'
import { deserializeMdxRemoteDocument } from '#app/mdx-remote/compiler/serialize.ts'

test('compiles and serializes validated mdx remote document', async () => {
	const { document, serialized } = await compileMdxRemoteDocument({
		slug: 'hello',
		frontmatter: {
			title: 'Hello',
		},
		root: {
			type: 'root',
			children: [
				{
					type: 'element',
					name: 'p',
					children: [{ type: 'text', value: 'Hello world' }],
				},
			],
		},
		allowedComponentNames: [],
		compiledAt: '2026-02-25T00:00:00.000Z',
	})

	expect(document.slug).toBe('hello')
	expect(deserializeMdxRemoteDocument(serialized).frontmatter).toEqual({
		title: 'Hello',
	})
})

test('rejects unknown component names that are not allowlisted', async () => {
	expect(() =>
		compileMdxRemoteDocument({
			slug: 'unknown-component',
			frontmatter: {},
			root: {
				type: 'root',
				children: [{ type: 'element', name: 'SubscribeForm' }],
			},
			allowedComponentNames: [],
		}),
	).toThrow(/unknown mdx component/i)
})

test('rejects forbidden expression syntax in nodes and props', async () => {
	expect(() =>
		compileMdxRemoteDocument({
			slug: 'forbidden-expression',
			frontmatter: {},
			root: {
				type: 'root',
				children: [
					{ type: 'expression', value: 'new Date()' },
					{
						type: 'element',
						name: 'p',
						props: {
							label: {
								type: 'expression',
								value: 'eval(user.name)',
							},
						},
					},
				],
			},
			allowedComponentNames: [],
		}),
	).toThrow(/forbidden expression syntax/i)
})

test('executes compiler plugins with document context', async () => {
	const plugin = vi.fn(async () => {})
	await compileMdxRemoteDocument({
		slug: 'plugin-test',
		frontmatter: { title: 'Plugin Test' },
		root: {
			type: 'root',
			children: [{ type: 'element', name: 'p', children: [] }],
		},
		allowedComponentNames: [],
		plugins: [plugin],
	})

	expect(plugin).toHaveBeenCalledWith(
		expect.objectContaining({
			slug: 'plugin-test',
			frontmatter: { title: 'Plugin Test' },
		}),
	)
})
