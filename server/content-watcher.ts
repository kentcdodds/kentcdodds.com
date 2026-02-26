import type http from 'http'
import path from 'path'
import chokidar from 'chokidar'
import { WebSocket, WebSocketServer } from 'ws'

const safePath = (s: string) => s.replace(/\\/g, '/')

function getContentPath(filePath: string) {
	return safePath(filePath).replace(`${safePath(process.cwd())}/content/`, '')
}

function getReloadPaths({
	contentDir,
	filePath,
}: {
	contentDir: string
	filePath: string
}) {
	const relativePath = safePath(
		`/${path.relative(
			contentDir,
			filePath.replace(path.extname(filePath), ''),
		)}`,
	)
	const contentPath = getContentPath(filePath)
	const mappedPaths =
		contentPath === 'data/resume.yml'
			? ['/resume']
			: contentPath === 'data/talks.yml'
				? ['/talks']
				: []

	return [...new Set([relativePath, ...mappedPaths])]
}

function addWatcher(wss: WebSocketServer) {
	const contentDir = safePath(path.join(process.cwd(), 'content'))
	const watcher = chokidar.watch(contentDir, { ignoreInitial: true })
	watcher.on('change', async (filePath) => {
		const reloadPaths = getReloadPaths({ contentDir, filePath })
		for (const client of wss.clients) {
			if (client.readyState === WebSocket.OPEN) {
				for (const relativePath of reloadPaths) {
					client.send(
						JSON.stringify({
							type: 'kentcdodds.com:file-change',
							data: { filePath, relativePath },
						}),
					)
				}
			}
		}
	})
}

export function contentWatcher(server: http.Server) {
	const wss = new WebSocketServer({ server, path: '/__ws' })
	addWatcher(wss)
	return wss
}
