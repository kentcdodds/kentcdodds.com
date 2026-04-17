// @vitest-environment node
import { expect, test } from 'vitest'
import {
	markdownContentType,
	maybeConvertHtmlResponseToMarkdown,
	requestPrefersMarkdown,
} from '../markdown-negotiation.ts'

test('requestPrefersMarkdown returns true when markdown outranks html', () => {
	const accepts = (types: Array<string>) =>
		types.find((value) => value === 'text/markdown') ?? false

	expect(requestPrefersMarkdown(accepts)).toBe(true)
})

test('requestPrefersMarkdown returns false when html is preferred', () => {
	const accepts = (types: Array<string>) =>
		types.find((value) => value === 'text/html') ?? false

	expect(requestPrefersMarkdown(accepts)).toBe(false)
})

test('maybeConvertHtmlResponseToMarkdown converts html responses', async () => {
	const response = new Response(
		`<!doctype html>
<html>
	<head>
		<title>Example page</title>
	</head>
	<body>
		<main>
			<h1>Heading</h1>
			<p>Hello <strong>world</strong>.</p>
		</main>
	</body>
</html>`,
		{
			headers: {
				'content-type': 'text/html; charset=utf-8',
				vary: 'Cookie',
			},
			status: 200,
			statusText: 'OK',
		},
	)

	const markdownResponse = await maybeConvertHtmlResponseToMarkdown(response)
	const markdown = await markdownResponse.text()

	expect(markdownResponse.headers.get('content-type')).toBe(markdownContentType)
	expect(markdownResponse.headers.get('vary')).toBe('Cookie, Accept')
	expect(markdownResponse.headers.get('x-markdown-tokens')).toBeTruthy()
	expect(markdown).toContain('# Example page')
	expect(markdown).toContain('# Heading')
	expect(markdown).toContain('Hello **world**.')
})

test('maybeConvertHtmlResponseToMarkdown leaves non-html responses alone', async () => {
	const response = new Response('{"ok":true}', {
		headers: { 'content-type': 'application/json' },
		status: 200,
	})

	const result = await maybeConvertHtmlResponseToMarkdown(response)

	expect(result).toBe(response)
})
