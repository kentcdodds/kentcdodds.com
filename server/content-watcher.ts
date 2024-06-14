import type http from 'http'
import path from 'path'
import chokidar from 'chokidar'
import { WebSocket, WebSocketServer } from 'ws'
import { postRefreshCache } from '../other/utils.js'

const safePath = (s: string) => s.replace(/\\/g, '/')

async function refreshOnContentChanges(filePath: string) {
	const http = await import('http')
	return postRefreshCache({
		http,
		options: {
			// @ts-expect-error - postRefreshCache is not typed
			hostname: 'localhost',
			port: 3000,
		},
		postData: {
			contentPaths: [
				safePath(filePath).replace(`${safePath(process.cwd())}/content/`, ''),
			],
		},
	}).then(
		(response: unknown) =>
			console.log(`Content change request finished.`, { response }),
		(error: unknown) =>
			console.error(`Content change request errored`, { error }),
	)
}

function addWatcher(wss: WebSocketServer) {
	const contentDir = safePath(path.join(process.cwd(), 'content'))
	const watcher = chokidar.watch(contentDir, { ignoreInitial: true })
	watcher.on('change', async (filePath) => {
		await refreshOnContentChanges(filePath)
		for (const client of wss.clients) {
			if (client.readyState === WebSocket.OPEN) {
				const relativePath = safePath(
					`/${path.relative(
						contentDir,
						filePath.replace(path.extname(filePath), ''),
					)}`,
				)
				client.send(
					JSON.stringify({
						type: 'kentcdodds.com:file-change',
						data: { filePath, relativePath },
					}),
				)
			}
		}
	})
}

export function contentWatcher(server: http.Server) {
	const wss = new WebSocketServer({ server, path: '/__ws' })
	addWatcher(wss)
	return wss
}
