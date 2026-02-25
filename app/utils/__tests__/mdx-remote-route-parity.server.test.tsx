import fs from 'node:fs/promises'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { test, expect, vi } from 'vitest'
import { compileMdxRemoteDocumentFromSource } from '#app/mdx-remote/compiler/from-mdast.ts'
import { mdxRemoteComponentAllowlist } from '#app/mdx-remote/component-allowlist.ts'
import { useMdxComponent } from '#app/utils/mdx.tsx'
import { parseFrontmatter } from '../../../other/content/compile-mdx-remote-documents.ts'

const { useOptionalUserMock } = vi.hoisted(() => ({
	useOptionalUserMock: vi.fn(() => ({ name: 'Kent', firstName: 'Kent' })),
}))

vi.mock('#app/utils/use-root-data.ts', () => ({
	useOptionalUser: () => useOptionalUserMock(),
}))

vi.mock('mdx-bundler/client/index.js', () => ({
	getMDXComponent: vi.fn(() => () => <p>bundled-mdx</p>),
}))

async function renderRemoteMdxFromContentPath(contentPath: string) {
	const absolutePath = path.resolve(process.cwd(), contentPath)
	const source = await fs.readFile(absolutePath, 'utf8')
	const { frontmatter, body } = parseFrontmatter(source)
	const remoteDocument = await compileMdxRemoteDocumentFromSource({
		slug: contentPath,
		source: body,
		frontmatter,
		allowedComponentNames: mdxRemoteComponentAllowlist,
		strictComponentValidation: true,
		strictExpressionValidation: true,
	})

	const originalFlag = process.env.ENABLE_MDX_REMOTE
	process.env.ENABLE_MDX_REMOTE = 'true'
	try {
		function TestRoute() {
			const Component = useMdxComponent({
				code: 'unused when remote document is present',
				remoteDocument,
			})
			return <Component />
		}
		return renderToStaticMarkup(
			<MemoryRouter>
				<TestRoute />
			</MemoryRouter>,
		)
	} finally {
		if (typeof originalFlag === 'undefined') {
			delete process.env.ENABLE_MDX_REMOTE
		} else {
			process.env.ENABLE_MDX_REMOTE = originalFlag
		}
	}
}

test.each([
	{
		contentPath: 'content/blog/fix-the-not-wrapped-in-act-warning/index.mdx',
		expectedText: 'Imagine you have a component like this:',
	},
	{
		contentPath:
			'content/blog/use-react-error-boundary-to-handle-errors-in-react/index.mdx',
		expectedText: 'What&#x27;s wrong with this code?',
	},
	{
		contentPath: 'content/blog/dont-call-a-react-function-component/index.mdx',
		expectedText: 'I got a great question',
	},
	{
		contentPath: 'content/blog/the-state-initializer-pattern/index.mdx',
		expectedText: 'The state initializer pattern',
	},
])(
	'renders strict mdx-remote content parity for $contentPath',
	async ({ contentPath, expectedText }) => {
		const markup = await renderRemoteMdxFromContentPath(contentPath)
		expect(markup).toContain(expectedText)
		expect(markup).not.toContain('Unknown MDX runtime component')
	},
)
