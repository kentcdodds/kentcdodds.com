import { execa } from 'execa'
import * as readline from 'node:readline'
import type { Key } from 'node:readline'

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
		process.kill(process.pid, 'SIGTERM')
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
}: StartupShortcutOptions) => {
	if (process.env.NODE_ENV === 'production') {
		return
	}

	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return
	}

	readline.emitKeypressEvents(process.stdin)
	process.stdin.setRawMode(true)
	process.stdin.resume()

	const handlers = createDefaultHandlers({ localUrl, helpMessage })

	process.stdin.on('keypress', (input: string, key?: Key) => {
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
