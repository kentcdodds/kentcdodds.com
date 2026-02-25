import { type Root } from 'mdast'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import {
	compileMdxRemoteDocument,
} from '#app/mdx-remote/compiler/compile.ts'
import {
	type MdxRemoteDocument,
	type MdxRemoteNode,
	type MdxRemotePropValue,
	type MdxRemoteRootNode,
} from '#app/mdx-remote/compiler/types.ts'

type MdxNode = {
	type: string
	[key: string]: unknown
}

async function compileMdxRemoteDocumentFromSource<
	Frontmatter extends Record<string, unknown>,
>({
	slug,
	source,
	frontmatter,
	allowedComponentNames,
	strictComponentValidation = true,
	strictExpressionValidation = true,
}: {
	slug: string
	source: string
	frontmatter: Frontmatter
	allowedComponentNames: Array<string>
	strictComponentValidation?: boolean
	strictExpressionValidation?: boolean
}) {
	const mdast = unified()
		.use(remarkParse)
		.use(remarkMdx)
		.use(remarkFrontmatter, ['yaml', 'toml'])
		.parse(source) as Root
	const root = convertMdastToRemoteRoot(mdast)
	const { document } = await compileMdxRemoteDocument({
		slug,
		frontmatter,
		root,
		allowedComponentNames,
		strictComponentValidation,
		strictExpressionValidation,
	})
	return document
}

function convertMdastToRemoteRoot(root: Root): MdxRemoteRootNode {
	return {
		type: 'root',
		children: compactNodes(
			root.children.map((node) => convertMdastNode(node as MdxNode)),
		),
	}
}

function convertMdastNode(node: MdxNode): MdxRemoteNode | null {
	switch (node.type) {
		case 'text':
			return {
				type: 'text',
				value: String(node.value ?? ''),
			}
		case 'paragraph':
			return createElementNode('p', node)
		case 'heading':
			return createElementNode(`h${node.depth ?? 1}`, node)
		case 'blockquote':
			return createElementNode('blockquote', node)
		case 'list':
			return {
				type: 'element',
				name: node.ordered ? 'ol' : 'ul',
				props:
					typeof node.start === 'number'
						? {
								start: node.start,
							}
						: undefined,
				children: compactNodes(
					((node.children as Array<MdxNode>) ?? []).map((child) =>
						convertMdastNode(child),
					),
				),
			}
		case 'listItem':
			return createElementNode('li', node)
		case 'strong':
			return createElementNode('strong', node)
		case 'emphasis':
			return createElementNode('em', node)
		case 'delete':
			return createElementNode('del', node)
		case 'break':
			return {
				type: 'element',
				name: 'br',
			}
		case 'inlineCode':
			return {
				type: 'element',
				name: 'code',
				children: [
					{
						type: 'text',
						value: String(node.value ?? ''),
					},
				],
			}
		case 'code':
			return {
				type: 'element',
				name: 'pre',
				children: [
					{
						type: 'element',
						name: 'code',
						props:
							typeof node.lang === 'string'
								? { className: `language-${node.lang}` }
								: undefined,
						children: [
							{
								type: 'text',
								value: String(node.value ?? ''),
							},
						],
					},
				],
			}
		case 'link':
			return {
				type: 'element',
				name: 'a',
				props: {
					href: String(node.url ?? ''),
					...(node.title ? { title: String(node.title) } : {}),
				},
				children: compactNodes(
					((node.children as Array<MdxNode>) ?? []).map((child) =>
						convertMdastNode(child),
					),
				),
			}
		case 'image':
			return {
				type: 'element',
				name: 'img',
				props: {
					src: String(node.url ?? ''),
					...(node.alt ? { alt: String(node.alt) } : {}),
					...(node.title ? { title: String(node.title) } : {}),
				},
			}
		case 'thematicBreak':
			return {
				type: 'element',
				name: 'hr',
			}
		case 'table':
			return createElementNode('table', node)
		case 'tableRow':
			return createElementNode('tr', node)
		case 'tableCell':
			return createElementNode('td', node)
		case 'mdxJsxFlowElement':
		case 'mdxJsxTextElement':
			return convertMdxJsxElementNode(node)
		case 'mdxFlowExpression':
		case 'mdxTextExpression':
			return {
				type: 'expression',
				value: String(node.value ?? ''),
			}
		case 'yaml':
		case 'toml':
			return null
		case 'html':
			return {
				type: 'text',
				value: String(node.value ?? ''),
			}
		default:
			if (typeof node.value === 'string') {
				return {
					type: 'text',
					value: node.value,
				}
			}
			return null
	}
}

function createElementNode(name: string, node: MdxNode): MdxRemoteNode {
	return {
		type: 'element',
		name,
		children: compactNodes(
			((node.children as Array<MdxNode>) ?? []).map((child) =>
				convertMdastNode(child),
			),
		),
	}
}

function convertMdxJsxElementNode(node: MdxNode): MdxRemoteNode {
	const props = convertMdxJsxAttributes(node.attributes as Array<MdxNode> | undefined)
	return {
		type: 'element',
		name: String(node.name ?? 'div'),
		...(Object.keys(props).length ? { props } : {}),
		children: compactNodes(
			((node.children as Array<MdxNode>) ?? []).map((child) =>
				convertMdastNode(child),
			),
		),
	}
}

function convertMdxJsxAttributes(
	attributes: Array<MdxNode> | undefined,
): Record<string, MdxRemotePropValue> {
	const props: Record<string, MdxRemotePropValue> = {}
	for (const attribute of attributes ?? []) {
		if (attribute.type === 'mdxJsxExpressionAttribute') {
			throw new Error('Spread attributes are not supported in mdx-remote documents')
		}
		if (attribute.type !== 'mdxJsxAttribute') continue
		const name = String(attribute.name ?? '')
		if (!name) continue
		if (attribute.value === null || typeof attribute.value === 'undefined') {
			props[name] = true
			continue
		}
		if (
			typeof attribute.value === 'string' ||
			typeof attribute.value === 'number' ||
			typeof attribute.value === 'boolean'
		) {
			props[name] = attribute.value
			continue
		}
		if (
			typeof attribute.value === 'object' &&
			attribute.value !== null &&
			'type' in attribute.value &&
			(attribute.value as { type?: string }).type === 'mdxJsxAttributeValueExpression'
		) {
			const expressionValue = String(
				(attribute.value as { value?: string }).value ?? '',
			)
			const jsxPropNode = convertJsxAttributeExpressionToNode(expressionValue)
			if (jsxPropNode) {
				props[name] = {
					type: 'node',
					value: jsxPropNode,
				}
				continue
			}
			props[name] = {
				type: 'expression',
				value: expressionValue,
			}
			continue
		}
		props[name] = String(attribute.value)
	}
	return props
}

function convertJsxAttributeExpressionToNode(
	expressionSource: string,
): MdxRemoteNode | null {
	const source = unwrapWrappedExpression(expressionSource).trim()
	if (!source.startsWith('<')) return null
	try {
		const mdast = unified().use(remarkParse).use(remarkMdx).parse(source) as Root
		const remoteRoot = convertMdastToRemoteRoot(mdast)
		if (remoteRoot.children.length === 0) return null
		if (remoteRoot.children.length === 1) {
			const [singleNode] = remoteRoot.children
			if (!singleNode) return null
			return unwrapMarkdownParagraphWrapper(singleNode)
		}
		return remoteRoot
	} catch {
		return null
	}
}

function unwrapMarkdownParagraphWrapper(node: MdxRemoteNode) {
	if (
		node.type === 'element' &&
		node.name === 'p' &&
		!node.props &&
		node.children?.length === 1
	) {
		const [singleChild] = node.children
		if (singleChild?.type === 'element') {
			return singleChild
		}
	}
	return node
}

function unwrapWrappedExpression(source: string) {
	let result = source.trim()
	while (result.startsWith('(') && result.endsWith(')')) {
		const next = result.slice(1, -1).trim()
		if (!next || next === result) break
		result = next
	}
	return result
}

function compactNodes(nodes: Array<MdxRemoteNode | null>) {
	return nodes.filter((node): node is MdxRemoteNode => node !== null)
}

export { compileMdxRemoteDocumentFromSource, convertMdastToRemoteRoot }
export type { MdxRemoteDocument }
