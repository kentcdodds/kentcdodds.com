import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import getPort from 'get-port'

const args = process.argv.slice(2)
const envName = process.env.CLOUDFLARE_ENV ?? 'development'
const isDevCommand = args[0] === 'dev'

const commandArgs = [...args]
if (!hasEnvFlag(args)) {
	commandArgs.push('--env', envName)
}

let resolvedPort = process.env.PORT
if (isDevCommand) {
	resolvedPort = await resolvePort(args, resolvedPort)
}
if (isDevCommand && resolvedPort && !hasFlag(args, '--port')) {
	commandArgs.push('--port', resolvedPort)
}

if (isDevCommand && !hasInspectorPortFlag(args)) {
	const inspectorPort = await resolveInspectorPort(resolvedPort)
	commandArgs.push('--inspector-port', inspectorPort)
}

const wranglerCommand = resolveWranglerCommand()
const child = spawn(wranglerCommand, commandArgs, {
	stdio: ['inherit', 'inherit', 'inherit'],
	env: {
		...process.env,
		CLOUDFLARE_ENV: envName,
		...(resolvedPort ? { PORT: resolvedPort } : {}),
	},
})

let isShuttingDown = false
function handleSignal(signal: NodeJS.Signals) {
	if (isShuttingDown) return
	isShuttingDown = true
	child.kill(signal)
	setTimeout(() => {
		if (child.exitCode === null) {
			child.kill('SIGKILL')
		}
	}, 5_000).unref()
}

process.on('SIGINT', () => handleSignal('SIGINT'))
process.on('SIGTERM', () => handleSignal('SIGTERM'))
process.on('exit', () => {
	if (child.exitCode === null) {
		child.kill('SIGKILL')
	}
})

const exitCode = await waitForExit(child)
if (isDevCommand && resolvedPort) {
	await waitForPortFree(Number.parseInt(resolvedPort, 10), 5_000)
}
process.exit(exitCode)

function hasFlag(argumentList: ReadonlyArray<string>, flag: string) {
	return argumentList.includes(flag) || argumentList.some((arg) => arg.startsWith(`${flag}=`))
}

function hasEnvFlag(argumentList: ReadonlyArray<string>) {
	return hasFlag(argumentList, '--env') || hasFlag(argumentList, '-e')
}

function hasInspectorPortFlag(argumentList: ReadonlyArray<string>) {
	return hasFlag(argumentList, '--inspector-port')
}

function getFlagValue(argumentList: ReadonlyArray<string>, flag: string) {
	const inlineArg = argumentList.find((arg) => arg.startsWith(`${flag}=`))
	if (inlineArg) {
		return inlineArg.slice(flag.length + 1)
	}
	const flagIndex = argumentList.findIndex((arg) => arg === flag)
	if (flagIndex >= 0) {
		return argumentList[flagIndex + 1]
	}
	return undefined
}

async function resolvePort(
	argumentList: ReadonlyArray<string>,
	defaultPort: string | undefined,
) {
	const fromArgument = getFlagValue(argumentList, '--port')
	if (fromArgument) {
		return fromArgument
	}
	if (defaultPort) {
		return defaultPort
	}
	const availablePort = await getPort({
		port: Array.from({ length: 10 }, (_unused, index) => 8787 + index),
	})
	return String(availablePort)
}

async function resolveInspectorPort(port: string | undefined) {
	const parsedPort = port ? Number.parseInt(port, 10) : Number.NaN
	const preferredRange = Number.isFinite(parsedPort)
		? Array.from({ length: 10 }, (_unused, index) => parsedPort + 10_000 + index).filter(
				(value) => value <= 65_535,
			)
		: undefined
	const inspectorPort = await getPort({
		host: '127.0.0.1',
		...(preferredRange?.length ? { port: preferredRange } : {}),
	})
	return String(inspectorPort)
}

function resolveWranglerCommand() {
	const localWrangler = path.join(
		process.cwd(),
		'node_modules',
		'.bin',
		process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler',
	)
	if (existsSync(localWrangler)) {
		return localWrangler
	}
	return process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler'
}

async function waitForPortFree(port: number, timeoutMs: number) {
	const start = Date.now()
	while (await isPortInUse(port)) {
		if (Date.now() - start > timeoutMs) {
			return
		}
		await delay(100)
	}
}

function isPortInUse(port: number) {
	return new Promise<boolean>((resolve) => {
		const socket = new net.Socket()
		const finish = (inUse: boolean) => {
			socket.removeAllListeners()
			socket.destroy()
			resolve(inUse)
		}

		socket.setTimeout(250)
		socket.once('connect', () => finish(true))
		socket.once('timeout', () => finish(true))
		socket.once('error', (error) => {
			if ('code' in error && error.code === 'ECONNREFUSED') {
				finish(false)
				return
			}
			finish(true)
		})

		socket.connect(port, '127.0.0.1')
	})
}

function waitForExit(childProcess: ChildProcess) {
	return new Promise<number>((resolve) => {
		childProcess.once('exit', (code, signal) => {
			if (typeof code === 'number') {
				resolve(code)
				return
			}
			if (signal === 'SIGINT' || signal === 'SIGTERM') {
				resolve(0)
				return
			}
			resolve(1)
		})
	})
}
