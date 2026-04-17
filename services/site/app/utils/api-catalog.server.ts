import { getDomainUrl } from './misc.ts'

const apiCatalogPath = '/.well-known/api-catalog'
const openApiPath = '/openapi.json'
const apiDocsPath = '/.well-known/api-docs'
const healthcheckPath = '/healthcheck'

const apiCatalogProfileUrl = 'https://www.rfc-editor.org/info/rfc9727'
const linksetContentType = `application/linkset+json; profile="${apiCatalogProfileUrl}"`
const htmlContentType = 'text/html; charset=utf-8'
const openApiContentType = 'application/vnd.oai.openapi+json'

type LinkTarget = {
	href: string
	type?: string
}

type ApiCatalogDocument = {
	linkset: Array<{
		anchor: string
		'service-desc': Array<LinkTarget>
		'service-doc': Array<LinkTarget>
		status: Array<LinkTarget>
	}>
}

function getAbsoluteUrl(origin: string, pathname: string) {
	return pathname === '/' ? origin : `${origin}${pathname}`
}

function createJsonResponse(
	body: unknown,
	{
		contentType,
		headers = {},
	}: {
		contentType: string
		headers?: Record<string, string>
	},
) {
	const stringifiedBody = JSON.stringify(body)

	return new Response(stringifiedBody, {
		headers: {
			'Cache-Control': 'public, max-age=3600',
			'Content-Length': String(Buffer.byteLength(stringifiedBody)),
			'Content-Type': contentType,
			...headers,
		},
	})
}

function createTextResponse(
	body: string,
	{
		contentType,
		headers = {},
	}: {
		contentType: string
		headers?: Record<string, string>
	},
) {
	return new Response(body, {
		headers: {
			'Cache-Control': 'public, max-age=3600',
			'Content-Length': String(Buffer.byteLength(body)),
			'Content-Type': contentType,
			...headers,
		},
	})
}

function getApiCatalogDocument(request: Request): ApiCatalogDocument {
	const origin = getDomainUrl(request)

	return {
		linkset: [
			{
				anchor: origin,
				'service-desc': [
					{
						href: getAbsoluteUrl(origin, openApiPath),
						type: openApiContentType,
					},
				],
				'service-doc': [
					{
						href: getAbsoluteUrl(origin, apiDocsPath),
						type: 'text/html',
					},
				],
				status: [
					{
						href: getAbsoluteUrl(origin, healthcheckPath),
						type: 'text/plain',
					},
				],
			},
		],
	}
}

function getApiCatalogResponse(request: Request) {
	const origin = getDomainUrl(request)

	return createJsonResponse(getApiCatalogDocument(request), {
		contentType: linksetContentType,
		headers: {
			Link: `<${getAbsoluteUrl(origin, apiCatalogPath)}>; rel="api-catalog"`,
		},
	})
}

function getOpenApiDocument(request: Request) {
	const origin = getDomainUrl(request)

	return {
		openapi: '3.1.0',
		info: {
			title: 'Kent C. Dodds Site API',
			version: '1.0.0',
			summary: 'Public discovery endpoints for kentcdodds.com.',
			description:
				'OpenAPI description for the public machine-consumable endpoints published by kentcdodds.com.',
		},
		jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
		servers: [
			{
				url: origin,
				description: 'Current site origin',
			},
		],
		externalDocs: {
			description: 'Human-readable API documentation',
			url: getAbsoluteUrl(origin, apiDocsPath),
		},
		tags: [
			{
				name: 'discovery',
				description: 'Catalog, spec, and health endpoints',
			},
			{
				name: 'content',
				description: 'Published site content feeds',
			},
			{
				name: 'search',
				description: 'Public content search endpoints',
			},
		],
		paths: {
			[apiCatalogPath]: {
				get: {
					tags: ['discovery'],
					summary: 'Get the API catalog',
					operationId: 'getApiCatalog',
					responses: {
						'200': {
							description: 'API catalog in RFC 9727 Linkset format',
							content: {
								'application/linkset+json': {
									schema: { type: 'object' },
								},
							},
						},
					},
				},
			},
			[openApiPath]: {
				get: {
					tags: ['discovery'],
					summary: 'Get the OpenAPI description',
					operationId: 'getOpenApiDocument',
					responses: {
						'200': {
							description: 'OpenAPI 3.1 JSON document',
							content: {
								[openApiContentType]: {
									schema: { type: 'object' },
								},
							},
						},
					},
				},
			},
			[healthcheckPath]: {
				get: {
					tags: ['discovery'],
					summary: 'Health check',
					operationId: 'getHealthcheck',
					responses: {
						'200': {
							description: 'The app instance is healthy',
							content: {
								'text/plain': {
									schema: { type: 'string' },
									example: 'OK',
								},
							},
						},
						'500': {
							description: 'The app instance encountered an error',
							content: {
								'text/plain': {
									schema: { type: 'string' },
									example: 'ERROR',
								},
							},
						},
					},
				},
			},
			'/blog.json': {
				get: {
					tags: ['content'],
					summary: 'Get published blog metadata',
					operationId: 'getBlogJson',
					responses: {
						'200': {
							description: 'Published blog content as JSON',
							content: {
								'application/json': {
									schema: { type: 'object' },
								},
							},
						},
					},
				},
			},
			'/resources/search': {
				get: {
					tags: ['search'],
					summary: 'Search public site content',
					operationId: 'searchSiteContent',
					parameters: [
						{
							name: 'query',
							in: 'query',
							required: true,
							description: 'Search query string',
							schema: {
								type: 'string',
								minLength: 1,
							},
						},
					],
					responses: {
						'200': {
							description: 'Search results',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											noCloseMatches: { type: 'boolean' },
											results: {
												type: 'array',
												items: {
													type: 'object',
													properties: {
														url: { type: 'string', format: 'uri' },
														segment: { type: 'string' },
														title: { type: 'string' },
														summary: { type: 'string' },
														imageUrl: {
															type: ['string', 'null'],
															format: 'uri',
														},
														imageAlt: { type: ['string', 'null'] },
													},
												},
											},
										},
									},
								},
							},
						},
						'400': {
							description: 'Missing or invalid query',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											error: { type: 'string' },
										},
										required: ['error'],
									},
								},
							},
						},
					},
				},
			},
		},
	}
}

function getOpenApiResponse(request: Request) {
	return createJsonResponse(getOpenApiDocument(request), {
		contentType: openApiContentType,
	})
}

function getApiDocsHtml(request: Request) {
	const origin = getDomainUrl(request)
	const catalogUrl = getAbsoluteUrl(origin, apiCatalogPath)
	const openApiUrl = getAbsoluteUrl(origin, openApiPath)
	const healthcheckUrl = getAbsoluteUrl(origin, healthcheckPath)
	const searchUrl = `${getAbsoluteUrl(origin, '/resources/search')}?query=react`
	const blogUrl = getAbsoluteUrl(origin, '/blog.json')

	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kent C. Dodds Site API</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        background: #0f172a;
        color: #e2e8f0;
      }
      main {
        max-width: 48rem;
        margin: 0 auto;
        padding: 3rem 1.5rem 4rem;
      }
      a {
        color: #7dd3fc;
      }
      code, pre {
        font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, monospace;
      }
      pre {
        padding: 1rem;
        border-radius: 0.75rem;
        overflow-x: auto;
        background: rgba(15, 23, 42, 0.65);
        border: 1px solid rgba(148, 163, 184, 0.25);
      }
      .card {
        margin-top: 1.5rem;
        padding: 1rem 1.25rem;
        border-radius: 0.75rem;
        background: rgba(30, 41, 59, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.2);
      }
      ul {
        padding-left: 1.25rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Kent C. Dodds Site API</h1>
      <p>Public discovery endpoints for automated API clients.</p>

      <div class="card">
        <h2>Discovery</h2>
        <ul>
          <li><a href="${catalogUrl}"><code>${catalogUrl}</code></a> - RFC 9727 API catalog</li>
          <li><a href="${openApiUrl}"><code>${openApiUrl}</code></a> - OpenAPI 3.1 description</li>
          <li><a href="${healthcheckUrl}"><code>${healthcheckUrl}</code></a> - Health endpoint</li>
        </ul>
      </div>

      <div class="card">
        <h2>Documented endpoints</h2>
        <ul>
          <li><code>GET /resources/search?query=...</code> returns JSON search results.</li>
          <li><code>GET /blog.json</code> returns published blog metadata as JSON.</li>
          <li><code>GET /healthcheck</code> returns plain-text health status.</li>
        </ul>
      </div>

      <div class="card">
        <h2>Quick examples</h2>
        <pre>curl -H 'Accept: application/linkset+json' ${catalogUrl}
curl ${openApiUrl}
curl ${searchUrl}
curl ${blogUrl}</pre>
      </div>
    </main>
  </body>
</html>`
}

function getApiDocsResponse(request: Request) {
	return createTextResponse(getApiDocsHtml(request), {
		contentType: htmlContentType,
	})
}

export {
	apiCatalogProfileUrl,
	apiCatalogPath,
	apiDocsPath,
	getApiCatalogDocument,
	getApiCatalogResponse,
	getApiDocsResponse,
	getOpenApiDocument,
	getOpenApiResponse,
	linksetContentType,
	openApiContentType,
}
