import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test, vi } from 'vitest'
import { useMdxComponent } from '#app/utils/mdx.tsx'

const { useOptionalUserMock } = vi.hoisted(() => ({
	useOptionalUserMock: vi.fn(() => ({ name: 'Kent' })),
}))

vi.mock('#app/utils/use-root-data.ts', () => ({
	useOptionalUser: () => useOptionalUserMock(),
}))

const { getMdxComponentMock } = vi.hoisted(() => ({
	getMdxComponentMock: vi.fn((_code: string) => () => <p>bundled-mdx</p>),
}))

vi.mock('mdx-bundler/client/index.js', () => ({
	getMDXComponent: (code: string) => getMdxComponentMock(code),
}))

test('useMdxComponent renders mdx-remote document when runtime flag is enabled', () => {
	const originalFlag = process.env.ENABLE_MDX_REMOTE
	process.env.ENABLE_MDX_REMOTE = 'true'
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
			code: 'unused when remote is enabled',
			remoteDocument,
		})
		return <Component />
	}

	try {
		const markup = renderToStaticMarkup(<TestRoute />)
		expect(markup).toContain('<p>Hello Kent</p>')
		expect(getMdxComponentMock).not.toHaveBeenCalled()
	} finally {
		if (typeof originalFlag === 'undefined') {
			delete process.env.ENABLE_MDX_REMOTE
		} else {
			process.env.ENABLE_MDX_REMOTE = originalFlag
		}
	}
})

test('useMdxComponent falls back to bundled mdx when runtime flag is disabled', () => {
	const originalFlag = process.env.ENABLE_MDX_REMOTE
	process.env.ENABLE_MDX_REMOTE = 'false'
	getMdxComponentMock.mockClear()
	const remoteDocument = {
		schemaVersion: 1 as const,
		slug: 'fallback',
		frontmatter: {},
		compiledAt: '2026-02-25T00:00:00.000Z',
		root: {
			type: 'root' as const,
			children: [{ type: 'text' as const, value: 'remote' }],
		},
	}

	function TestRoute() {
		const Component = useMdxComponent({
			code: 'compiled bundled code',
			remoteDocument,
		})
		return <Component />
	}

	try {
		const markup = renderToStaticMarkup(<TestRoute />)
		expect(markup).toContain('bundled-mdx')
		expect(getMdxComponentMock).toHaveBeenCalledWith('compiled bundled code')
	} finally {
		if (typeof originalFlag === 'undefined') {
			delete process.env.ENABLE_MDX_REMOTE
		} else {
			process.env.ENABLE_MDX_REMOTE = originalFlag
		}
	}
})
