import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { type MdxRemoteDocument } from '#app/mdx-remote/compiler/types.ts'
import { createMdxRemoteRuntimeContext } from '#app/mdx-remote/runtime/context.ts'
import { renderMdxRemoteDocument } from '#app/mdx-remote/runtime/renderer.tsx'

test('renders text, expressions, and components from remote tree', () => {
	const document: MdxRemoteDocument<Record<string, unknown>> = {
		schemaVersion: 1,
		slug: 'hello',
		frontmatter: {},
		compiledAt: '2026-02-25T00:00:00.000Z',
		root: {
			type: 'root',
			children: [
				{
					type: 'element',
					name: 'p',
					children: [
						{ type: 'text', value: 'Hello ' },
						{ type: 'expression', value: 'user.name' },
					],
				},
				{
					type: 'element',
					name: 'Badge',
					props: {
						label: {
							type: 'expression',
							value: 'badgeLabel',
						},
					},
				},
			],
		},
	}

	const markup = renderToStaticMarkup(
		<>
			{renderMdxRemoteDocument({
				document,
				context: createMdxRemoteRuntimeContext({
					scope: {
						user: { name: 'Kent' },
						badgeLabel: 'Pro',
					},
				}),
				components: {
					Badge: ({ label }: { label: string }) => <strong>{label}</strong>,
				},
			})}
		</>,
	)

	expect(markup).toContain('<p>Hello Kent</p>')
	expect(markup).toContain('<strong>Pro</strong>')
})

test('throws for unknown component names', () => {
	const document: MdxRemoteDocument<Record<string, unknown>> = {
		schemaVersion: 1,
		slug: 'unknown-component',
		frontmatter: {},
		compiledAt: '2026-02-25T00:00:00.000Z',
		root: {
			type: 'root',
			children: [{ type: 'element', name: 'UnknownComponent' }],
		},
	}

	expect(() =>
		renderToStaticMarkup(
			<>
				{renderMdxRemoteDocument({
					document,
					context: createMdxRemoteRuntimeContext(),
				})}
			</>,
		),
	).toThrow(/unknown mdx runtime component/i)
})
