import http from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const port = Number(process.env.PRISMA_SIDECAR_PORT ?? 3101)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const siteRoot = path.resolve(__dirname, '../../../site')

process.chdir(siteRoot)
process.env.DATABASE_URL ??= 'file:./prisma/sqlite.db'

const { PrismaClient } = await import(
	pathToFileURL(
		path.join(siteRoot, 'app/utils/prisma-generated.server/client.ts'),
	).href
)

const prisma = new PrismaClient({
	adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL }),
})

function sendJson(res, status, body) {
	res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
	res.end(JSON.stringify(body))
}

async function readJson(req) {
	const chunks = []
	for await (const chunk of req) chunks.push(chunk)
	return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

const server = http.createServer(async (req, res) => {
	try {
		if (req.method === 'GET' && req.url === '/health') {
			return sendJson(res, 200, { ok: true })
		}
		console.log(`[prisma-sidecar] ${req.method} ${req.url}`)
		if (req.method !== 'POST') {
			return sendJson(res, 405, { ok: false, error: 'Method not allowed' })
		}

		const payload = await readJson(req)
		if (req.url === '/query') {
			const { model, operation, args } = payload
			try {
				const modelClient = prisma[model]
				if (!modelClient || typeof modelClient[operation] !== 'function') {
					return sendJson(res, 400, {
						ok: false,
						error: { name: 'Error', message: `Unknown ${model}.${operation}` },
					})
				}
				const result = await modelClient[operation](args)
				return sendJson(res, 200, { ok: true, result })
			} catch (error) {
				const err = error
				return sendJson(res, 200, {
					ok: false,
					error: {
						name: err.name ?? 'Error',
						code: err.code,
						message: err.message ?? String(err),
						meta: err.meta,
						clientVersion: err.clientVersion,
					},
				})
			}
		}

		if (req.url === '/raw') {
			const { method, query, values = [] } = payload
			try {
				let result
				if (method === '$queryRaw' || method === '$executeRaw') {
					result = await prisma[method](query, ...values)
				} else if (
					method === '$queryRawUnsafe' ||
					method === '$executeRawUnsafe'
				) {
					result = await prisma[method](query, ...values)
				} else {
					return sendJson(res, 400, {
						ok: false,
						error: { name: 'Error', message: `Unsupported raw method ${method}` },
					})
				}
				return sendJson(res, 200, { ok: true, result })
			} catch (error) {
				const err = error
				return sendJson(res, 200, {
					ok: false,
					error: {
						name: err.name ?? 'Error',
						code: err.code,
						message: err.message ?? String(err),
						meta: err.meta,
						clientVersion: err.clientVersion,
					},
				})
			}
		}

		return sendJson(res, 404, { ok: false, error: 'Not found' })
	} catch (error) {
		console.error('prisma-sidecar error', error)
		return sendJson(res, 500, {
			ok: false,
			error: { name: 'Error', message: String(error) },
		})
	}
})

server.listen(port, () => {
	console.log(`prisma-sidecar listening on http://127.0.0.1:${port}`)
})
