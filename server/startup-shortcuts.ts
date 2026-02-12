import * as fs from 'node:fs'
import * as readline from 'node:readline'
import { type Key } from 'node:readline'
import * as tty from 'node:tty'
import { execa } from 'execa'

type ShortcutHandlers = {
	openApp: () => void | Promise<void>
	copyUrl: () => void | Promise<void>
	restartApp: () => void
	showHelp: () => void
	exitApp: () => void
	addNewline: () => void
}

type StartupShortcutOptions = {
	localUrl: string
	helpMessage: string
	restartEnabled?: boolean
}

const tryRunCommand = async (
	command: string,
	args: Array<string>,
	input?: string,
) => {
	try {
		await execa(command, args, input ? { input } : undefined)
		return true
	} catch {
		return false
	}
}

const openInBrowser = async (url: string) => {
	if (process.platform === 'darwin') {
		return tryRunCommand('open', [url])
	}

	if (process.platform === 'win32') {
		return tryRunCommand('cmd', ['/c', 'start', '', url])
	}

	return tryRunCommand('xdg-open', [url])
}

const copyToClipboard = async (value: string) => {
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

const createDefaultHandlers = ({
	localUrl,
	helpMessage,
	restartEnabled = false,
}: StartupShortcutOptions): ShortcutHandlers => ({
	openApp: async () => {
		const opened = await openInBrowser(localUrl)
		if (!opened) {
			console.warn('Unable to open app in your browser.')
		}
	},
	copyUrl: async () => {
		const copied = await copyToClipboard(localUrl)
		if (!copied) {
			console.warn('Unable to copy URL to the clipboard.')
		}
	},
	restartApp: () => {
		if (!restartEnabled) {
			console.warn('Restart shortcut is unavailable in this session.')
			return
		}

		if (process.env.NODE_ENV === 'development') {
			process.kill(process.pid, 'SIGTERM')
			return
		}

		console.warn('Restart shortcut is only available in development.')
	},
	showHelp: () => {
		console.log(helpMessage)
	},
	exitApp: () => {
		process.kill(process.pid, 'SIGINT')
	},
	addNewline: () => {
		process.stdout.write('\n')
	},
})

const normalizeKeyName = (keyName: string) => keyName.toLowerCase()

export const handleShortcutKey = (
	keyName: string,
	handlers: ShortcutHandlers,
) => {
	const normalizedKey = normalizeKeyName(keyName)

	switch (normalizedKey) {
		case 'o':
			void handlers.openApp()
			return true
		case 'c':
			void handlers.copyUrl()
			return true
		case 'r':
			handlers.restartApp()
			return true
		case 'h':
			handlers.showHelp()
			return true
		case 'q':
			handlers.exitApp()
			return true
		case 'return':
		case 'enter':
			handlers.addNewline()
			return true
		default:
			return false
	}
}

export const registerStartupShortcuts = ({
	localUrl,
	helpMessage,
	restartEnabled,
}: StartupShortcutOptions) => {
	if (process.env.STARTUP_SHORTCUTS === 'false') {
		return
	}

	if (process.env.NODE_ENV === 'production') {
		return
	}

	if (!process.stdout.isTTY) {
		return
	}

	const inputStream = process.stdin.isTTY
		? process.stdin
		: (() => {
				if (process.platform === 'win32') {
					return null
				}

				try {
					const fd = fs.openSync('/dev/tty', 'r')
					const stream = new tty.ReadStream(fd)
					stream.on('close', () => {
						try {
							fs.closeSync(fd)
						} catch {
							// best effort cleanup
						}
					})
					return stream
				} catch {
					return null
				}
			})()

	if (!inputStream) {
		console.warn(
			'Unable to enable startup shortcuts because no TTY input is available.',
		)
		return
	}

	if (inputStream !== process.stdin) {
		console.log('Startup shortcuts using /dev/tty for input.')
	}

	readline.emitKeypressEvents(inputStream)
	if (typeof inputStream.setRawMode === 'function') {
		inputStream.setRawMode(true)
	}
	inputStream.resume()

	const handlers = createDefaultHandlers({
		localUrl,
		helpMessage,
		restartEnabled,
	})

	inputStream.on('error', (error: unknown) => {
		console.warn('Startup shortcuts input error:', error)
	})

	inputStream.on('close', () => {
		console.warn('Startup shortcuts input closed.')
	})

	inputStream.on('keypress', (input: string, key?: Key) => {
		if (key?.ctrl && key?.name === 'c') {
			handlers.exitApp()
			return
		}

		const keyName = key?.name ?? input
		if (!keyName) {
			return
		}

		handleShortcutKey(keyName, handlers)
	})
}
