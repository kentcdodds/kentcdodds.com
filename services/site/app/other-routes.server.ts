import { type EntryContext } from 'react-router'
import {
	apiCatalogPath,
	apiDocsPath,
	getApiCatalogResponse,
	getApiDocsResponse,
	getOpenApiResponse,
	openApiPath,
} from './utils/api-catalog.server.ts'
import { getSitemapXml } from './utils/sitemap.server.ts'

type Handler = (
	request: Request,
	remixContext: EntryContext,
) => Response | Promise<Response | null> | null

const pathedRoutes: Record<string, Handler> = {
	[apiCatalogPath]: (request) => {
		return getApiCatalogResponse(request)
	},
	[apiDocsPath]: (request) => {
		return getApiDocsResponse(request)
	},
	[openApiPath]: (request) => {
		return getOpenApiResponse(request)
	},
	'/sitemap.xml': async (request, remixContext) => {
		const sitemap = await getSitemapXml(request, remixContext)
		return new Response(sitemap, {
			headers: {
				'Content-Type': 'application/xml',
				'Content-Length': String(Buffer.byteLength(sitemap)),
			},
		})
	},
}

const routes: Array<Handler> = Object.entries(pathedRoutes).map(
	([path, handler]) => {
		return (request: Request, remixContext: EntryContext) => {
			if (new URL(request.url).pathname !== path) return null

			return handler(request, remixContext)
		}
	},
)

export { routes, pathedRoutes }
