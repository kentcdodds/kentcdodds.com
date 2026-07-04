import path from 'node:path'
import { NodeResolvePlugin } from '@esbuild-plugins/node-resolve'
import { rehypeCodeBlocksShiki } from '@kentcdodds/md-temp'
import remarkEmbedderImport, {
	type TransformerInfo,
} from '@remark-embedder/core'
import oembedTransformerImport from '@remark-embedder/transformer-oembed'
import esbuild from 'esbuild'
import grayMatter from 'gray-matter'
import type * as H from 'hast'
import lz from 'lz-string'
import type * as M from 'mdast'
import { bundleMDX } from 'mdx-bundler'
import calculateReadingTime from 'reading-time'
import remarkAutolinkHeadings from 'remark-autolink-headings'
import gfm from 'remark-gfm'
import remarkSlug from 'remark-slug'
import type * as U from 'unified'
import { visit } from 'unist-util-visit'
import { v4 as uuid } from 'uuid'
import { type GitHubFile } from '#app/types.ts'
import * as x from './x.server.ts'

const MDX_ESM_EXTERNALS = [
	'react',
	'react/jsx-runtime',
	'react/jsx-dev-runtime',
	'react-dom',
] as const

function interopDefault<T>(imported: T): T {
	if (
		imported &&
		typeof imported === 'object' &&
		'default' in imported &&
		(imported as { default?: T }).default != null
	) {
		return (imported as { default: T }).default
	}
	return imported
}

const remarkEmbedder = interopDefault(remarkEmbedderImport)
const oembedTransformer = interopDefault(oembedTransformerImport)

type EmbedTransformer = {
	shouldTransform: (url: string, ...args: Array<unknown>) => boolean
	getHTML: (url: string, ...args: Array<unknown>) => unknown
}

let allowEmbedFallback = false
let embedFallbackCount = 0

export function configureMdxCompileOptions(options: {
	allowEmbedFallback?: boolean
}) {
	allowEmbedFallback = options.allowEmbedFallback ?? false
	embedFallbackCount = 0
}

export function getEmbedFallbackCount() {
	return embedFallbackCount
}

function recordEmbedFallback(url: string, reason: string) {
	embedFallbackCount++
	console.warn(`[mdx:embed-fallback] ${url} (${reason})`)
}

function wrapEmbedTransformer<T extends EmbedTransformer>(transformer: T): T {
	if (!allowEmbedFallback) return transformer

	const { getHTML } = transformer
	return {
		...transformer,
		getHTML: async (url: string, ...rest: Array<unknown>) => {
			try {
				return await getHTML(url, ...rest)
			} catch (error: unknown) {
				recordEmbedFallback(
					url,
					error instanceof Error ? error.message : String(error),
				)
				return null
			}
		},
	}
}

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
	if (allowEmbedFallback) {
		recordEmbedFallback(url, 'remark-embedder handleError')
	}
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
const cloudinaryUrlRegex =
	/^https?:\/\/res\.cloudinary\.com\/(?<cloudName>.+?)\/image\/upload\/((?<transforms>(.+?_.+?)+?)\/)?(\/?(?<version>v\d+)\/)?(?<publicId>.+$)/

function optimizeCloudinaryImages() {
	return async function transformer(tree: H.Root) {
		// `unist-util-visit` types can differ between mdast/hast; this tree is hast
		// but can still contain MDX nodes. Use `any` to avoid type churn.
		visit(tree as any, 'mdxJsxFlowElement' as any, function visitor(node: any) {
			if (node?.name !== 'img') return
			const srcAttr = node.attributes?.find(
				(attr: any) => attr?.type === 'mdxJsxAttribute' && attr?.name === 'src',
			)
			const urlString = srcAttr?.value ? String(srcAttr.value) : null
			if (!srcAttr || !urlString) {
				console.error('image without url?', node)
				return
			}
			const newUrl = handleImageUrl(urlString)
			if (newUrl) {
				srcAttr.value = newUrl
			}
		})

		visit(tree, 'element', function visitor(node: H.Element) {
			if (node.tagName !== 'img') return
			const urlString = node.properties?.src
				? String(node.properties.src)
				: null
			if (!node.properties?.src || !urlString) {
				console.error('image without url?', node)
				return
			}
			const newUrl = handleImageUrl(urlString)
			if (newUrl) {
				node.properties.src = newUrl
			}
		})
	}

	function handleImageUrl(urlString: string) {
		const match = urlString.match(cloudinaryUrlRegex)
		const groups = match?.groups
		if (groups) {
			const { cloudName, transforms, version, publicId } = groups as {
				cloudName: string
				transforms?: string
				version?: string
				publicId: string
			}
			// don't add transforms if they're already included
			if (transforms) return
			const defaultTransforms = [
				'f_auto',
				'q_auto',
				// gifs can't do dpr transforms
				publicId.endsWith('.gif') ? '' : 'dpr_2.0',
				'w_1600',
			]
				.filter(Boolean)
				.join(',')
			return [
				`https://res.cloudinary.com/${cloudName}/image/upload`,
				defaultTransforms,
				version,
				publicId,
			]
				.filter(Boolean)
				.join('/')
		}
	}
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

function getMdxEmbedTransformers(): Array<EmbedTransformer> {
	return [
		wrapEmbedTransformer(twitterTransformer),
		wrapEmbedTransformer(eggheadTransformer),
		wrapEmbedTransformer(oembedTransformer as EmbedTransformer),
	]
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

	const url = new URL('https://mermaid-to-svg.kentcdodds.workers.dev/svg')
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

function getMdxCustomRemarkPlugins(): U.PluggableList {
	return [
		remarkMermaidCodeToThemedSvg,
		[
			remarkEmbedder,
			{
				handleError: handleEmbedderError,
				handleHTML: handleEmbedderHtml,
				transformers: getMdxEmbedTransformers(),
			},
		],
		autoAffiliates,
	]
}

const mdxCustomRehypePlugins: U.PluggableList = [
	optimizeCloudinaryImages,
	trimCodeBlocks,
	rehypeCodeBlocksShiki,
	removePreContainerDivs,
]

function applyMdxBundlerPluginOptions(
	options: {
		remarkPlugins?: U.PluggableList
		rehypePlugins?: U.PluggableList
		jsxImportSource?: string
	},
	_frontmatter?: Record<string, unknown>,
) {
	options.remarkPlugins = [
		...(options.remarkPlugins ?? []),
		remarkSlug,
		[remarkAutolinkHeadings, { behavior: 'wrap' }],
		gfm,
		...getMdxCustomRemarkPlugins(),
	] as U.PluggableList
	options.rehypePlugins = [
		...(options.rehypePlugins ?? []),
		...mdxCustomRehypePlugins,
	] as U.PluggableList
	return options
}

type PreparedMdxBundle = {
	indexFile: GitHubFile
	files: Record<string, string>
	entryPath: string
	cwd: string
	absoluteFiles: Record<string, string>
}

function prepareMdxBundleInputs(
	slug: string,
	githubFiles: Array<GitHubFile>,
): PreparedMdxBundle | null {
	const indexRegex = new RegExp(`${slug}\\/index.mdx?$`)
	const indexFile = githubFiles.find(({ path: filePath }) =>
		indexRegex.test(filePath),
	)
	if (!indexFile) return null

	const rootDir = indexFile.path.replace(/index.mdx?$/, '')
	const relativeFiles: Array<GitHubFile> = githubFiles.map(
		({ path: filePath, content }) => ({
			path: filePath.replace(rootDir, './'),
			content,
		}),
	)
	const files = arrayToObj(relativeFiles, {
		keyName: 'path',
		valueName: 'content',
	}) as Record<string, string>

	const cwd = path.join(process.cwd(), '__mdx_bundler_fake_dir__')
	const entryPath = path.join(cwd, `./_mdx_bundler_entry_point-${uuid()}.mdx`)
	const absoluteFiles: Record<string, string> = {
		[entryPath]: indexFile.content,
	}
	for (const [filePath, fileCode] of Object.entries(files)) {
		absoluteFiles[path.join(cwd, filePath)] = fileCode
	}

	return { indexFile, files, entryPath, cwd, absoluteFiles }
}

function createMdxExternalReactEsbuildPlugin(): esbuild.Plugin {
	return {
		name: 'mdx-external-react',
		setup(build) {
			build.onResolve({ filter: /^react(?:\/|$)/ }, (args) => ({
				path: args.path,
				external: true,
			}))
			build.onResolve({ filter: /^react-dom(?:\/|$)/ }, (args) => ({
				path: args.path,
				external: true,
			}))
		},
	}
}

function createMdxInMemoryEsbuildPlugin(
	entryPath: string,
	absoluteFiles: Record<string, string>,
): esbuild.Plugin {
	return {
		name: 'inMemory',
		setup(build) {
			build.onResolve({ filter: /.*/ }, ({ path: filePath, importer }) => {
				if (filePath === entryPath) {
					return {
						path: filePath,
						pluginData: {
							inMemory: true,
							contents: absoluteFiles[filePath],
						},
					}
				}
				const modulePath = path.resolve(path.dirname(importer), filePath)
				if (modulePath in absoluteFiles) {
					return {
						path: modulePath,
						pluginData: {
							inMemory: true,
							contents: absoluteFiles[modulePath],
						},
					}
				}
				for (const ext of ['.js', '.ts', '.jsx', '.tsx', '.json', '.mdx']) {
					const fullModulePath = `${modulePath}${ext}`
					if (fullModulePath in absoluteFiles) {
						return {
							path: fullModulePath,
							pluginData: {
								inMemory: true,
								contents: absoluteFiles[fullModulePath],
							},
						}
					}
				}
				return null
			})
			build.onLoad({ filter: /.*/ }, async ({ path: filePath, pluginData }) => {
				if (pluginData === undefined || !pluginData.inMemory) {
					return null
				}
				const fileType = (path.extname(filePath) || '.jsx').slice(1)
				const contents = absoluteFiles[filePath]
				if (fileType === 'mdx') return null

				const loader: esbuild.Loader =
					build.initialOptions.loader?.[`.${fileType}`] ??
					(fileType as esbuild.Loader)
				return { contents, loader }
			})
		},
	}
}

async function compileMdx<FrontmatterType extends Record<string, unknown>>(
	slug: string,
	githubFiles: Array<GitHubFile>,
) {
	const prepared = prepareMdxBundleInputs(slug, githubFiles)
	if (!prepared) return null
	const { indexFile, files } = prepared

	try {
		const { frontmatter, code } = await bundleMDX({
			source: indexFile.content,
			files,
			mdxOptions(options) {
				return applyMdxBundlerPluginOptions(options)
			},
		})
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

async function compileMdxEsm<FrontmatterType extends Record<string, unknown>>(
	slug: string,
	githubFiles: Array<GitHubFile>,
) {
	const prepared = prepareMdxBundleInputs(slug, githubFiles)
	if (!prepared) return null
	const { indexFile, entryPath, cwd, absoluteFiles } = prepared

	try {
		const [
			{ default: mdxESBuild },
			{ default: remarkFrontmatter },
			{ default: remarkMdxFrontmatter },
		] = await Promise.all([
			import('@mdx-js/esbuild'),
			import('remark-frontmatter'),
			import('remark-mdx-frontmatter'),
		])

		const matter = grayMatter(indexFile.content)

		const bundled = await esbuild.build({
			entryPoints: [entryPath],
			write: false,
			absWorkingDir: cwd,
			define: {
				'process.env.NODE_ENV': JSON.stringify(
					process.env.NODE_ENV ?? 'production',
				),
			},
			jsx: 'automatic',
			jsxImportSource: 'react',
			mainFields: ['module', 'browser', 'main'],
			conditions: ['module', 'import', 'default'],
			plugins: [
				createMdxExternalReactEsbuildPlugin(),
				createMdxInMemoryEsbuildPlugin(entryPath, absoluteFiles),
				NodeResolvePlugin({
					extensions: ['.js', '.ts', '.jsx', '.tsx'],
					mainFields: ['module', 'browser', 'main'],
					resolveOptions: {
						basedir: cwd,
					},
				}),
				mdxESBuild(
					applyMdxBundlerPluginOptions(
						{
							remarkPlugins: [
								remarkFrontmatter,
								[remarkMdxFrontmatter, { name: 'frontmatter' }],
							],
							jsxImportSource: 'react',
						},
						matter.data,
					),
				),
			],
			bundle: true,
			format: 'esm',
			external: [...MDX_ESM_EXTERNALS],
			minify: true,
		})

		if (!bundled.outputFiles?.[0]) {
			throw new Error(`esbuild produced no output for slug: ${slug}`)
		}

		const code = new TextDecoder().decode(bundled.outputFiles[0].contents)
		const readTime = calculateReadingTime(indexFile.content)

		return {
			code,
			readTime,
			frontmatter: matter.data as FrontmatterType,
		}
	} catch (error: unknown) {
		console.error(`ESM compilation error for slug: `, slug)
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

export {
	applyMdxBundlerPluginOptions,
	compileMdx,
	compileMdxEsm,
	mdxCustomRehypePlugins,
	getMdxCustomRemarkPlugins as mdxCustomRemarkPlugins,
	MDX_ESM_EXTERNALS,
}
