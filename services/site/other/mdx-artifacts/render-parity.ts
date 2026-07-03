import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import * as mdxBundler from 'mdx-bundler/client/index.js'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { type MdxArtifactDocument } from '../../types/mdx-artifacts.ts'

const verifyDir = path.join(process.cwd(), 'node_modules', '.mdx-verify')

const stubComponents = {
	a: ({ children, href, ...props }: React.ComponentPropsWithoutRef<'a'>) =>
		React.createElement('a', { href, ...props }, children),
	table: (props: React.ComponentPropsWithoutRef<'table'>) =>
		React.createElement('table', props),
	Themed: ({
		light,
		dark,
	}: {
		light?: React.ReactNode
		dark?: React.ReactNode
	}) => light ?? dark ?? null,
	CloudinaryVideo: () => null,
	MermaidDiagram: ({
		lightSvg,
		darkSvg,
		code,
	}: {
		lightSvg?: string
		darkSvg?: string
		code?: string
	}) =>
		React.createElement(
			'div',
			{ 'data-mermaid': true },
			lightSvg ?? darkSvg ?? code ?? null,
		),
	ThemedBlogImage: ({
		lightCloudinaryId,
		darkCloudinaryId,
		imgProps,
	}: {
		lightCloudinaryId?: string
		darkCloudinaryId?: string
		imgProps?: React.ComponentProps<'img'>
	}) =>
		React.createElement('img', {
			...imgProps,
			'data-light': lightCloudinaryId,
			'data-dark': darkCloudinaryId,
		}),
	BlogImage: ({
		cloudinaryId,
		imgProps,
	}: {
		cloudinaryId?: string
		imgProps?: React.ComponentProps<'img'>
	}) =>
		React.createElement('img', {
			...imgProps,
			'data-cloudinary-id': cloudinaryId,
		}),
	SubscribeForm: () => null,
	OptionalUser: ({
		children,
	}: {
		children: (user: null) => React.ReactElement
	}) => children(null),
}

function renderIifeCode(code: string) {
	const Component = mdxBundler.getMDXComponent(code)
	return renderToStaticMarkup(
		React.createElement(Component, { components: stubComponents }),
	)
}

async function ensureVerifyDir() {
	await fs.mkdir(verifyDir, { recursive: true })
}

async function renderEsmCode(esm: string, key: string) {
	await ensureVerifyDir()
	const modulePath = path.join(verifyDir, `${key.replace(/\//g, '__')}.mjs`)
	await fs.writeFile(modulePath, esm, 'utf8')
	const imported = await import(pathToFileURL(modulePath).href)
	const Component = imported.default
	if (typeof Component !== 'function') {
		throw new Error(`ESM module for ${key} has no default export`)
	}
	return renderToStaticMarkup(
		React.createElement(Component, { components: stubComponents }),
	)
}

export async function verifyDocumentRenderParity(
	document: Pick<MdxArtifactDocument, 'code' | 'esm'>,
	key: string,
) {
	const iifeHtml = renderIifeCode(document.code)
	const esmHtml = await renderEsmCode(document.esm, key)
	return { iifeHtml, esmHtml, matches: iifeHtml === esmHtml }
}

export async function verifyDocumentsRenderParity(
	documents: Record<string, Pick<MdxArtifactDocument, 'code' | 'esm'>>,
) {
	const mismatches: Array<{
		key: string
		iifeLength: number
		esmLength: number
	}> = []

	for (const [key, document] of Object.entries(documents)) {
		const { matches, iifeHtml, esmHtml } = await verifyDocumentRenderParity(
			document,
			key,
		)
		if (!matches) {
			mismatches.push({
				key,
				iifeLength: iifeHtml.length,
				esmLength: esmHtml.length,
			})
		}
	}

	return {
		total: Object.keys(documents).length,
		mismatches,
	}
}

export const representativeDocumentKeys = [
	'blog/how-i-built-a-modern-website-in-2021',
	'blog/building-semantic-search-on-my-content',
	'blog/state-colocation-will-make-your-react-app-faster',
	'pages/uses',
	'blog/write-tests',
] as const
