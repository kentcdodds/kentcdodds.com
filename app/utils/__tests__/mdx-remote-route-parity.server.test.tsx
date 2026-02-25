import fs from 'node:fs/promises'
import path from 'node:path'
import { type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
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

vi.mock('#app/utils/theme.tsx', () => ({
	Themed: ({
		light,
		dark,
	}: {
		light?: ReactNode
		dark?: ReactNode
	}) => <>{light ?? dark ?? null}</>,
}))

vi.mock('#app/utils/misc-react.tsx', async () => {
	const actual = await vi.importActual('#app/utils/misc-react.tsx')
	return {
		...actual,
		AnchorOrLink: ({
			href,
			to,
			children,
			...rest
		}: {
			href?: string
			to?: string
			children?: ReactNode
			[key: string]: unknown
		}) => (
			<a href={to ?? href ?? ''} {...rest}>
				{children}
			</a>
		),
	}
})

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
		return renderToStaticMarkup(<TestRoute />)
	} finally {
		if (typeof originalFlag === 'undefined') {
			delete process.env.ENABLE_MDX_REMOTE
		} else {
			process.env.ENABLE_MDX_REMOTE = originalFlag
		}
	}
}

async function getContentPagePaths() {
	const pagesDirectory = path.resolve(process.cwd(), 'content/pages')
	const entries = await fs.readdir(pagesDirectory, { withFileTypes: true })
	return entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => `content/pages/${entry.name}/index.mdx`)
		.sort()
}

function getRepresentativeBlogPaths() {
	return [
		'content/blog/fix-the-not-wrapped-in-act-warning/index.mdx',
		'content/blog/use-react-error-boundary-to-handle-errors-in-react/index.mdx',
		'content/blog/dont-call-a-react-function-component/index.mdx',
		'content/blog/the-state-initializer-pattern/index.mdx',
		'content/blog/write-fewer-longer-tests/index.mdx',
		'content/blog/react-hooks-pitfalls/index.mdx',
		'content/blog/use-state-lazy-initialization-and-function-updates/index.mdx',
		'content/blog/how-to-test-custom-react-hooks/index.mdx',
		'content/blog/usememo-and-usecallback/index.mdx',
		'content/blog/understanding-reacts-key-prop/index.mdx',
		'content/blog/aha-testing/index.mdx',
		'content/blog/props-vs-state/index.mdx',
		'content/blog/avoid-the-test-user/index.mdx',
		'content/blog/avoid-nesting-when-youre-testing/index.mdx',
		'content/blog/fix-the-slow-render-before-you-fix-the-re-render/index.mdx',
		'content/blog/state-colocation-will-make-your-react-app-faster/index.mdx',
	]
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
	{
		contentPath: 'content/pages/uses/index.mdx',
		expectedText: '<h1>Uses</h1>',
	},
	{
		contentPath: 'content/pages/teams/index.mdx',
		expectedText: 'can choose between the Red, Yellow, or Blue team.',
	},
])(
	'renders strict mdx-remote content parity for $contentPath',
	async ({ contentPath, expectedText }) => {
		const markup = await renderRemoteMdxFromContentPath(contentPath)
		expect(markup).toContain(expectedText)
		expect(markup).not.toContain('Unknown MDX runtime component')
	},
)

test('renders all page mdx documents in strict mdx-remote mode', async () => {
	const pagePaths = await getContentPagePaths()
	for (const contentPath of pagePaths) {
		let markup = ''
		try {
			markup = await renderRemoteMdxFromContentPath(contentPath)
		} catch (error: unknown) {
			throw new Error(
				`Failed to render ${contentPath}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
		expect(markup.length).toBeGreaterThan(50)
		expect(markup).not.toContain('Unknown MDX runtime component')
	}
})

test('renders representative blog mdx documents in strict mdx-remote mode', async () => {
	const blogPaths = getRepresentativeBlogPaths()
	for (const contentPath of blogPaths) {
		let markup = ''
		try {
			markup = await renderRemoteMdxFromContentPath(contentPath)
		} catch (error: unknown) {
			throw new Error(
				`Failed to render ${contentPath}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
		expect(markup.length).toBeGreaterThan(50)
		expect(markup).not.toContain('Unknown MDX runtime component')
	}
})
