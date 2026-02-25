import { rehypeCodeBlocksShiki } from '@kentcdodds/md-temp'
import remarkEmbedder, { type TransformerInfo } from '@remark-embedder/core'
import oembedTransformer from '@remark-embedder/transformer-oembed'
import type * as H from 'hast'
import lz from 'lz-string'
import type * as M from 'mdast'
import { bundleMDX } from 'mdx-bundler'
import PQueue from 'p-queue'
import calculateReadingTime from 'reading-time'
import remarkAutolinkHeadings from 'remark-autolink-headings'
import gfm from 'remark-gfm'
import remarkSlug from 'remark-slug'
import type * as U from 'unified'
import { visit } from 'unist-util-visit'
import { type GitHubFile } from '#app/types.ts'
import { getEnv } from './env.server.ts'
import * as x from './x.server.ts'

// Minimal local types so we don't need to depend on `mdast-util-mdx-jsx` directly.
type MdxJsxAttribute = {
	type: 'mdxJsxAttribute'
	name: string
	value?: unknown
}

type MdxJsxFlowElement = {
	type: 'mdxJsxFlowElement'
	name: string
	attributes: Array<MdxJsxAttribute>
	children: Array<unknown>
}

function handleEmbedderError({ url }: { url: string }) {
	return `<p>Error embedding <a href="${url}">${url}</a></p>.`
}

type GottenHTML = string | null
function handleEmbedderHtml(html: GottenHTML, info: TransformerInfo) {
	if (!html) return null

	const url = new URL(info.url)
	// matches youtu.be and youtube.com
	if (/youtu\.?be/.test(url.hostname)) {
		// this allows us to set youtube embeds to 100% width and the
		// height will be relative to that width with a good aspect ratio
		return makeEmbed(html, 'youtube')
	}
	if (url.hostname.includes('codesandbox.io')) {
		return makeEmbed(html, 'codesandbox', '80%')
	}
	return html
}

function makeEmbed(html: string, type: string, heightRatio = '56.25%') {
	return `
  <div class="embed" data-embed-type="${type}">
    <div style="padding-bottom: ${heightRatio}">
      ${html}
    </div>
  </div>
`
}

function trimCodeBlocks() {
	return async function transformer(tree: H.Root) {
		visit(tree, 'element', (preNode: H.Element) => {
			if (preNode.tagName !== 'pre' || !preNode.children.length) {
				return
			}
			const codeNode = preNode.children[0]
			if (
				!codeNode ||
				codeNode.type !== 'element' ||
				codeNode.tagName !== 'code'
			) {
				return
			}
			const [codeStringNode] = codeNode.children
			if (!codeStringNode) return

			if (codeStringNode.type !== 'text') {
				console.warn(
					`trimCodeBlocks: Unexpected: codeStringNode type is not "text": ${codeStringNode.type}`,
				)
				return
			}
			codeStringNode.value = codeStringNode.value.trim()
		})
	}
}

// yes, I did write this myself 😬
const legacyMediaUploadPathRegex =
	/^\/media\/(?:(?<cloudName>[^/]+)\/)?image\/upload\/((?<transforms>(.+?_.+?)+?)\/)?(\/?(?<version>v\d+)\/)?(?<publicId>.+$)/

function optimizeMediaImages() {
	const baseUrl = getEnv().MEDIA_BASE_URL.replace(/\/+$/, '')

	return async function transformer(tree: H.Root) {
		// `unist-util-visit` types can differ between mdast/hast; this tree is hast
		// but can still contain MDX nodes. Use `any` to avoid type churn.
		visit(tree as any, 'mdxJsxFlowElement' as any, function visitor(node: any) {
			const srcAttr = node?.attributes?.find(
				(attr: any) => attr?.type === 'mdxJsxAttribute' && attr?.name === 'src',
			)
			if (!srcAttr) return
			const urlString = srcAttr.value ? String(srcAttr.value) : null
			if (!urlString) return
			// img, MediaVideo, or any element with media src
			const newUrl =
				node?.name === 'img'
					? handleImageUrl(urlString, baseUrl)
					: rewriteMediaHref(urlString, baseUrl) ?? handleImageUrl(urlString, baseUrl)
			if (newUrl) {
				srcAttr.value = newUrl
			}
		})

		visit(tree, 'element', function visitor(node: H.Element) {
			if (node.tagName === 'img') {
				const urlString = node.properties?.src
					? String(node.properties.src)
					: null
				if (!node.properties?.src || !urlString) {
					console.error('image without url?', node)
					return
				}
				const newUrl = handleImageUrl(urlString, baseUrl)
				if (newUrl) {
					node.properties.src = newUrl
				}
				return
			}
			if (node.tagName === 'a' && node.properties?.href) {
				const href = String(node.properties.href)
				const newHref = rewriteMediaHref(href, baseUrl)
				if (newHref) {
					node.properties.href = newHref
				}
			}
		})
	}

	function rewriteMediaHref(href: string, base: string): string | null {
		if (!href.startsWith('/media/')) return null
		const mediaMatch = href.match(legacyMediaUploadPathRegex)
		if (mediaMatch?.groups) {
			const { publicId, transforms } = mediaMatch.groups as {
				publicId: string
				transforms?: string
			}
			return buildMediaImageDeliveryUrl({ base, publicId, transforms })
		}
		const publicId = href.slice('/media/'.length).replace(/^\/+/, '')
		return buildMediaImageDeliveryUrl({ base, publicId })
	}

	function handleImageUrl(urlString: string, baseUrl: string): string | undefined {
		// Canonical form: /media/image/upload/...
		const mediaMatch = urlString.match(legacyMediaUploadPathRegex)
		if (mediaMatch?.groups) {
			const { transforms, publicId } = mediaMatch.groups as {
				transforms?: string
				publicId: string
			}
			if (transforms) {
				return buildMediaImageDeliveryUrl({
					base: baseUrl,
					publicId,
					transforms,
				})
			}
			const defaultTransforms = [
				'f_auto',
				'q_auto',
				publicId.endsWith('.gif') ? '' : 'dpr_2.0',
				'w_1600',
			]
				.filter(Boolean)
				.join(',')
			return buildMediaImageDeliveryUrl({
				base: baseUrl,
				publicId,
				transforms: defaultTransforms,
			})
		}
		if (urlString.startsWith('/media/')) {
			return buildMediaImageDeliveryUrl({
				base: baseUrl,
				publicId: urlString.slice('/media/'.length),
			})
		}
	}
}

function buildMediaImageDeliveryUrl({
	base,
	publicId,
	transforms,
}: {
	base: string
	publicId: string
	transforms?: string
}) {
	const normalizedBase = base.replace(/\/+$/, '')
	const normalizedPublicId = publicId.replace(/^\/+/, '')
	const mediaUrl = new URL(`${normalizedBase}/images/${normalizedPublicId}`)
	if (transforms) {
		mediaUrl.searchParams.set('tr', transforms)
	}
	return mediaUrl.toString()
}

const twitterTransformer = {
	shouldTransform: x.isXUrl,
	getHTML: x.getTweetEmbedHTML,
}

const eggheadTransformer = {
	shouldTransform: (url: string) => {
		const { host, pathname } = new URL(url)

		return (
			host === 'egghead.io' &&
			pathname.includes('/lessons/') &&
			!pathname.includes('/embed')
		)
	},
	getHTML: (url: string) => {
		const { host, pathname, searchParams } = new URL(url)

		// Don't preload videos
		if (!searchParams.has('preload')) {
			searchParams.set('preload', 'false')
		}

		// Kent's affiliate link
		if (!searchParams.has('af')) {
			searchParams.set('af', '5236ad')
		}

		const iframeSrc = `https://${host}${pathname}/embed?${searchParams.toString()}`

		return makeEmbed(
			`<iframe src="${iframeSrc}" allowfullscreen></iframe>`,
			'egghead',
		)
	},
}

function autoAffiliates() {
	return async function affiliateTransformer(tree: M.Root) {
		visit(tree, 'link', function visitor(linkNode: M.Link) {
			if (linkNode.url.includes('amazon.com')) {
				const amazonUrl = new URL(linkNode.url)
				if (!amazonUrl.searchParams.has('tag')) {
					amazonUrl.searchParams.set('tag', 'kentcdodds-20')
					linkNode.url = amazonUrl.toString()
				}
			}
			if (linkNode.url.includes('egghead.io')) {
				const eggheadUrl = new URL(linkNode.url)
				if (!eggheadUrl.searchParams.has('af')) {
					eggheadUrl.searchParams.set('af', '5236ad')
					linkNode.url = eggheadUrl.toString()
				}
			}
		})
	}
}

function removePreContainerDivs() {
	return async function preContainerDivsTransformer(tree: H.Root) {
		visit(
			tree,
			{ type: 'element', tagName: 'pre' },
			function visitor(node, index, parent) {
				if (parent?.type !== 'element') return
				if (parent.tagName !== 'div') return
				if (parent.children.length !== 1 && index === 0) return
				Object.assign(parent, node)
			},
		)
	}
}

type MermaidTheme = 'dark' | 'default'

function mdxStringExpressionAttribute(
	name: string,
	value: string,
): MdxJsxAttribute {
	return {
		type: 'mdxJsxAttribute',
		name,
		value: {
			type: 'mdxJsxAttributeValueExpression',
			value: JSON.stringify(value),
			// This hack brought to you by this:
			// https://github.com/syntax-tree/hast-util-to-estree/blob/e5ccb97e9f42bba90359ea6d0f83a11d74e0dad6/lib/handlers/mdx-expression.js#L35-L38
			// No idea why we're required to have estree here, but I'm pretty sure
			// someone is supposed to add it automatically for us and it just never
			// happens...
			data: {
				estree: {
					type: 'Program',
					sourceType: 'script',
					body: [
						{
							type: 'ExpressionStatement',
							expression: {
								type: 'Literal',
								value,
							},
						},
					],
				},
			},
		},
	}
}

async function getMermaidSvg({
	code,
	theme,
}: {
	code: string
	theme: MermaidTheme
}): Promise<string | null> {
	const trimmed = code.trim()
	if (!trimmed) return null

	const compressed = lz.compressToEncodedURIComponent(trimmed)
	if (!compressed) return null

	const url = new URL(
		'svg',
		`${getEnv().MERMAID_TO_SVG_BASE_URL.replace(/\/+$/, '')}/`,
	)
	url.searchParams.set('mermaid', compressed)
	url.searchParams.set('theme', theme)

	try {
		const response = await fetch(url)
		if (!response.ok) return null
		const svgText = await response.text()
		if (!svgText || !svgText.startsWith('<svg')) return null
		return svgText
	} catch {
		return null
	}
}

function remarkMermaidCodeToThemedSvg() {
	return async function transformer(tree: M.Root) {
		const promises: Array<Promise<void>> = []
		visit(tree, 'code', (node: M.Code, index, parent) => {
			if (node.lang !== 'mermaid') return
			if (!parent || typeof index !== 'number') return

			const promise = (async () => {
				const code = node.value
				const [lightSvg, darkSvg] = await Promise.all([
					getMermaidSvg({ code, theme: 'default' }),
					getMermaidSvg({ code, theme: 'dark' }),
				])

				// If we can't render either theme at compile time, keep the original
				// code block so it still shows up as text.
				if (!lightSvg && !darkSvg) return

				const attributes: Array<MdxJsxAttribute> = [
					mdxStringExpressionAttribute('code', code),
					...(lightSvg
						? [mdxStringExpressionAttribute('lightSvg', lightSvg)]
						: []),
					...(darkSvg
						? [mdxStringExpressionAttribute('darkSvg', darkSvg)]
						: []),
				]

				// `mdast`'s `RootContent` types don't include MDX JSX nodes, but `bundleMDX`
				// supports them. Cast so we can replace the code block with an MDX JSX
				// element without a bunch of type churn.
				;(parent.children as Array<any>)[index] = {
					type: 'mdxJsxFlowElement',
					name: 'MermaidDiagram',
					attributes,
					children: [],
				} satisfies MdxJsxFlowElement
			})()
			promises.push(promise)
		})
		await Promise.all(promises)
	}
}

const remarkPlugins: U.PluggableList = [
	remarkMermaidCodeToThemedSvg,
	[
		remarkEmbedder,
		{
			handleError: handleEmbedderError,
			handleHTML: handleEmbedderHtml,
			transformers: [twitterTransformer, eggheadTransformer, oembedTransformer],
		},
	],
	autoAffiliates,
]

const rehypePlugins: U.PluggableList = [
	optimizeMediaImages,
	trimCodeBlocks,
	rehypeCodeBlocksShiki,
	removePreContainerDivs,
]

async function withOembedApiRouting<T>(fn: () => Promise<T>) {
	const oembedApiBaseUrl = getEnv().OEMBED_API_BASE_URL
	if (oembedApiBaseUrl === 'https://oembed.com') {
		return fn()
	}
	const originalFetch = globalThis.fetch
	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const originalRequestUrl =
			typeof input === 'string' || input instanceof URL
				? new URL(String(input))
				: new URL(input.url)
		if (originalRequestUrl.origin !== 'https://oembed.com') {
			return originalFetch(input, init)
		}
		const routedUrl = new URL(
			originalRequestUrl.pathname.replace(/^\//, ''),
			`${oembedApiBaseUrl.replace(/\/+$/, '')}/`,
		)
		routedUrl.search = originalRequestUrl.search
		return originalFetch(routedUrl.toString(), init)
	}) as typeof fetch
	try {
		return await fn()
	} finally {
		globalThis.fetch = originalFetch
	}
}

async function compileMdx<FrontmatterType extends Record<string, unknown>>(
	slug: string,
	githubFiles: Array<GitHubFile>,
) {
	const indexRegex = new RegExp(`${slug}\\/index.mdx?$`)
	const indexFile = githubFiles.find(({ path }) => indexRegex.test(path))
	if (!indexFile) return null

	const rootDir = indexFile.path.replace(/index.mdx?$/, '')
	const relativeFiles: Array<GitHubFile> = githubFiles.map(
		({ path, content }) => ({
			path: path.replace(rootDir, './'),
			content,
		}),
	)
	const files = arrayToObj(relativeFiles, {
		keyName: 'path',
		valueName: 'content',
	})

	try {
		const { frontmatter, code } = await withOembedApiRouting(() =>
			bundleMDX({
				source: indexFile.content,
				files,
				mdxOptions(options) {
					options.remarkPlugins = [
						...(options.remarkPlugins ?? []),
						remarkSlug,
						[remarkAutolinkHeadings, { behavior: 'wrap' }],
						gfm,
						...remarkPlugins,
					]
					options.rehypePlugins = [
						...(options.rehypePlugins ?? []),
						...rehypePlugins,
					]
					return options
				},
			}),
		)
		const readTime = calculateReadingTime(indexFile.content)

		return {
			code,
			readTime,
			frontmatter: frontmatter as FrontmatterType,
		}
	} catch (error: unknown) {
		console.error(`Compilation error for slug: `, slug)
		throw error
	}
}

function arrayToObj<ItemType extends Record<string, unknown>>(
	array: Array<ItemType>,
	{
		keyName,
		valueName,
	}: { keyName: keyof ItemType; valueName: keyof ItemType },
) {
	const obj: Record<string, ItemType[keyof ItemType]> = {}
	for (const item of array) {
		const key = item[keyName]
		if (typeof key !== 'string') {
			throw new Error(`${String(keyName)} of item must be a string`)
		}
		const value = item[valueName]
		obj[key] = value
	}
	return obj
}

let _queue: PQueue | null = null
async function getQueue() {
	if (_queue) return _queue

	_queue = new PQueue({
		concurrency: 1,
		timeout: 1000 * 30,
	})
	return _queue
}

// We have to use a queue because we can't run more than one of these at a time
// or we'll hit an out of memory error because esbuild uses a lot of memory...
async function queuedCompileMdx<
	FrontmatterType extends Record<string, unknown>,
>(...args: Parameters<typeof compileMdx>) {
	const queue = await getQueue()
	const result = await queue.add(() => compileMdx<FrontmatterType>(...args))
	return result
}

export { queuedCompileMdx as compileMdx }
