import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test, vi } from 'vitest'
import { useMdxComponent } from '#app/utils/mdx.tsx'

const { useOptionalUserMock } = vi.hoisted(() => ({
	useOptionalUserMock: vi.fn(() => ({ name: 'Kent' })),
}))

vi.mock('#app/utils/use-root-data.ts', () => ({
	useOptionalUser: () => useOptionalUserMock(),
}))

test('useMdxComponent renders mdx-remote documents', () => {
	const remoteDocument = {
		schemaVersion: 1 as const,
		slug: 'hello',
		frontmatter: {
			title: 'Hello',
		},
		compiledAt: '2026-02-25T00:00:00.000Z',
		root: {
			type: 'root' as const,
			children: [
				{
					type: 'element' as const,
					name: 'p',
					children: [
						{ type: 'text' as const, value: 'Hello ' },
						{ type: 'expression' as const, value: 'user.name' },
					],
				},
			],
		},
	}

	function TestRoute() {
		const Component = useMdxComponent({
			remoteDocument,
		})
		return <Component />
	}

	const markup = renderToStaticMarkup(<TestRoute />)
	expect(markup).toContain('<p>Hello Kent</p>')
})
