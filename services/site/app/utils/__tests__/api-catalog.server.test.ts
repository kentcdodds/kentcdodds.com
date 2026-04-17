import { expect, test } from 'vitest'
import {
	apiCatalogPath,
	apiDocsPath,
	getApiCatalogDocument,
	getApiCatalogResponse,
	getApiDocsResponse,
	getOpenApiDocument,
	getOpenApiResponse,
	linksetContentType,
	openApiContentType,
} from '../api-catalog.server.ts'

function createRequest(pathname: string) {
	return new Request(`https://kentcdodds.com${pathname}`, {
		headers: { host: 'kentcdodds.com' },
	})
}

test('getApiCatalogDocument returns an RFC 9727 linkset entry', () => {
	const request = createRequest(apiCatalogPath)

	const document = getApiCatalogDocument(request)

	expect(document).toEqual({
		linkset: [
			{
				anchor: 'https://kentcdodds.com',
				'service-desc': [
					{
						href: 'https://kentcdodds.com/openapi.json',
						type: openApiContentType,
					},
				],
				'service-doc': [
					{
						href: 'https://kentcdodds.com/.well-known/api-docs',
						type: 'text/html',
					},
				],
				status: [
					{
						href: 'https://kentcdodds.com/healthcheck',
						type: 'text/plain',
					},
				],
			},
		],
	})
})

test('getApiCatalogResponse returns linkset+json with the RFC profile', async () => {
	const response = getApiCatalogResponse(createRequest(apiCatalogPath))

	expect(response.headers.get('Content-Type')).toBe(linksetContentType)
	expect(response.headers.get('Link')).toBe(
		'<https://kentcdodds.com/.well-known/api-catalog>; rel="api-catalog"',
	)
	await expect(response.json()).resolves.toEqual({
		linkset: [
			expect.objectContaining({
				anchor: 'https://kentcdodds.com',
			}),
		],
	})
})

test('getOpenApiDocument points discovery metadata at the current origin', () => {
	const request = createRequest('/openapi.json')

	const document = getOpenApiDocument(request)

	expect(document.openapi).toBe('3.1.0')
	expect(document.servers).toEqual([
		{
			url: 'https://kentcdodds.com',
			description: 'Current site origin',
		},
	])
	expect(document.externalDocs).toEqual({
		description: 'Human-readable API documentation',
		url: 'https://kentcdodds.com/.well-known/api-docs',
	})
	expect(
		document.paths[apiCatalogPath]?.get?.responses?.['200']?.content,
	).toEqual({
		'application/linkset+json': {
			schema: { type: 'object' },
		},
	})
})

test('getOpenApiResponse returns the configured OpenAPI media type', () => {
	const response = getOpenApiResponse(createRequest('/openapi.json'))

	expect(response.headers.get('Content-Type')).toBe(openApiContentType)
})

test('getApiDocsResponse returns HTML docs with discovery links', async () => {
	const response = getApiDocsResponse(createRequest(apiDocsPath))
	const body = await response.text()

	expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
	expect(body).toContain('Kent C. Dodds Site API')
	expect(body).toContain('https://kentcdodds.com/.well-known/api-catalog')
	expect(body).toContain('https://kentcdodds.com/openapi.json')
	expect(body).toContain('https://kentcdodds.com/healthcheck')
})
