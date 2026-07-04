import { toString } from 'hast-util-to-string'
import { visit } from 'unist-util-visit'
import rehypeParse from 'rehype-parse'
import rehype2remark from 'rehype-remark'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'

const markdownMediaType = 'text/markdown'
const markdownContentType = `${markdownMediaType}; charset=utf-8`

function requestPrefersMarkdown(
	accepts: (types: Array<string>) => string | false,
) {
	return accepts(['text/html', markdownMediaType]) === markdownMediaType
}

function responseCanBecomeMarkdown(response: Response) {
	return (
		response.ok &&
		Boolean(response.headers.get('content-type')?.match(/\btext\/html\b/i))
	)
}

function extractHtmlTitle(html: string) {
	const tree = unified().use(rehypeParse).parse(html)
	let title: string | null = null

	visit(tree, 'element', (node: any) => {
		if (node.tagName !== 'title') return
		const text = toString(node).replace(/\s+/g, ' ').trim()
		title = text || null
		return false
	})

	return title
}

function removeNonContentElements() {
	return function transformer(tree: any) {
		visit(tree, 'element', (node: any, index, parent) => {
			if (!parent || typeof index !== 'number') return

			if (
				['head', 'script', 'style', 'noscript', 'template'].includes(
					node.tagName,
				)
			) {
				parent.children.splice(index, 1)
				return index
			}
		})
	}
}

async function convertHtmlToMarkdown(html: string) {
	const title = extractHtmlTitle(html)
	const result = await unified()
		.use(rehypeParse)
		.use(removeNonContentElements)
		.use(rehype2remark)
		.use(remarkStringify, {
			bullet: '-',
			emphasis: '*',
			fences: true,
			listItemIndent: 'one',
			rule: '-',
			ruleRepetition: 3,
			strong: '*',
		})
		.process(html)

	const bodyMarkdown = result.value.toString().trim()
	const markdown =
		title && !bodyMarkdown.startsWith(`# ${title}`)
			? `# ${title}\n\n${bodyMarkdown}`
			: bodyMarkdown

	return `${markdown.replace(/\n{3,}/g, '\n\n').trim()}\n`
}

function estimateMarkdownTokens(markdown: string) {
	return Math.max(1, Math.ceil(markdown.length / 4))
}

function appendVaryValue(headers: Headers, value: string) {
	const vary = headers.get('vary')
	if (!vary) {
		headers.set('vary', value)
		return
	}

	const values = new Set(
		vary
			.split(',')
			.map((entry) => entry.trim())
			.filter(Boolean),
	)
	values.add(value)
	headers.set('vary', Array.from(values).join(', '))
}

async function maybeConvertHtmlResponseToMarkdown(response: Response) {
	if (!responseCanBecomeMarkdown(response)) return response

	const html = await response.text()
	const markdown = await convertHtmlToMarkdown(html)
	const headers = new Headers(response.headers)
	headers.delete('content-length')
	headers.set('content-type', markdownContentType)
	headers.set('x-markdown-tokens', String(estimateMarkdownTokens(markdown)))
	appendVaryValue(headers, 'Accept')

	return new Response(markdown, {
		headers,
		status: response.status,
		statusText: response.statusText,
	})
}

export {
	markdownContentType,
	maybeConvertHtmlResponseToMarkdown,
	requestPrefersMarkdown,
}
