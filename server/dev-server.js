import * as readline from 'node:readline'
import { execa } from 'execa'

const tryRunCommand = async (command, args, input) => {
	try {
		await execa(command, args, input ? { input } : undefined)
		return true
	} catch {
		return false
	}
}

const openInBrowser = async (url) => {
	if (process.platform === 'darwin') {
		return tryRunCommand('open', [url])
	}

	if (process.platform === 'win32') {
		return tryRunCommand('cmd', ['/c', 'start', '', url])
	}

	return tryRunCommand('xdg-open', [url])
}

const copyToClipboard = async (value) => {
	if (process.platform === 'darwin') {
		return tryRunCommand('pbcopy', [], value)
	}

	if (process.platform === 'win32') {
		return tryRunCommand('cmd', ['/c', 'clip'], value)
	}

	if (await tryRunCommand('wl-copy', [], value)) {
		return true
	}

	return tryRunCommand('xclip', ['-selection', 'clipboard'], value)
}

const stripAnsi = (value) => value.replace(/\x1b\[[0-9;]*m/g, '')

if (process.env.NODE_ENV === 'production') {
	// the file may not be there yet

	await import('../server-build/index.js')
} else {
	const command =
		'tsx watch --clear-screen=false --ignore ".cache/**" --ignore "app/**" --ignore "vite.config.ts.timestamp-*" --ignore "build/**" --ignore "node_modules/**" --ignore "mocks/msw.local.json" --ignore "prisma/sqlite.db*" --ignore "other/cache.db*" --inspect ./index.js'
	let childProcess = null
	let restarting = false
	let lastLocalUrl = `http://localhost:${process.env.PORT || 3000}`

	const extractLocalUrl = (text) => {
		const cleaned = stripAnsi(text)
		const localMatch = cleaned.match(/Local:\s+(\S+)/)
		if (localMatch?.[1]) {
			return localMatch[1]
		}
		const fallbackMatch = cleaned.match(/http:\/\/localhost:\d+/)
		return fallbackMatch?.[0] ?? null
	}

	const startChild = () => {
		childProcess = execa(command, {
			stdio: ['ignore', 'pipe', 'pipe'],
			shell: true,
			env: {
				FORCE_COLOR: '1',
				CLICOLOR_FORCE: '1',
				TERM: process.env.TERM ?? 'xterm-256color',
				MOCKS: true,
				STARTUP_SHORTCUTS: 'false',
				...process.env,
			},
			// https://github.com/sindresorhus/execa/issues/433
			windowsHide: false,
		})

		childProcess.stdout?.on('data', (chunk) => {
			const text = chunk.toString()
			process.stdout.write(text)
			const detectedUrl = extractLocalUrl(text)
			if (detectedUrl) {
				lastLocalUrl = detectedUrl
			}
		})

		childProcess.stderr?.on('data', (chunk) => {
			process.stderr.write(chunk)
		})

		childProcess.on('exit', (code, signal) => {
			if (restarting) {
				return
			}
			if (signal) {
				console.log(`Dev server exited with signal ${signal}.`)
				return
			}
			if (typeof code === 'number' && code !== 0) {
				console.log(`Dev server exited with code ${code}.`)
			}
		})
	}

	const restartChild = async () => {
		if (!childProcess) {
			startChild()
			return
		}

		restarting = true
		childProcess.kill('SIGTERM')
		try {
			await childProcess
		} catch {
			// ignore
		} finally {
			restarting = false
		}
		startChild()
	}

	const printHelp = () => {
		console.log(
			[
				'Supported keys:',
				`  o - open app (${lastLocalUrl})`,
				`  c - copy url (${lastLocalUrl})`,
				'  r - restart app',
				'  h - help',
				'  q - exit (or Ctrl+C)',
			].join('\n'),
		)
	}

	startChild()

	if (process.stdin.isTTY && process.stdout.isTTY) {
		readline.emitKeypressEvents(process.stdin)
		process.stdin.setRawMode(true)
		process.stdin.resume()

		process.stdin.on('keypress', async (input, key) => {
			if (key?.ctrl && key?.name === 'c') {
				childProcess?.kill('SIGINT')
				process.exit(0)
				return
			}

			const keyName = (key?.name ?? input ?? '').toLowerCase()
			if (!keyName) {
				return
			}

			switch (keyName) {
				case 'o': {
					const opened = await openInBrowser(lastLocalUrl)
					if (!opened) {
						console.warn('Unable to open app in your browser.')
					}
					break
				}
				case 'c': {
					const copied = await copyToClipboard(lastLocalUrl)
					if (!copied) {
						console.warn('Unable to copy URL to the clipboard.')
					}
					break
				}
				case 'r':
					await restartChild()
					break
				case 'h':
					printHelp()
					break
				case 'q':
					childProcess?.kill('SIGINT')
					process.exit(0)
					break
				case 'return':
				case 'enter':
					process.stdout.write('\n')
					break
				default:
					break
			}
		})
	} else {
		console.warn(
			'Dev server shortcuts disabled because no interactive TTY is available.',
		)
	}
}
