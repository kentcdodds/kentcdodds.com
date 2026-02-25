import { spawn, type ChildProcess } from 'node:child_process'

const args = process.argv.slice(2)
const mode = parseMode(args)
const script = mode === 'worker' ? 'dev:worker' : 'dev:app'
const scriptArgs = mode === 'worker' ? args.slice(1) : args

const runningModeLabel = mode === 'worker' ? 'worker preview' : 'node app server'
console.log(`Starting ${runningModeLabel} via "${script}"...`)

const child = spawnDevProcess(script, scriptArgs)
bindSignals(child)

const exitCode = await waitForExit(child)
process.exit(exitCode)

function parseMode(argumentList: Array<string>) {
	const candidate = argumentList[0]?.toLowerCase()
	return candidate === 'worker' ? 'worker' : 'app'
}

function spawnDevProcess(scriptName: string, scriptArguments: Array<string>) {
	const bunExecutable = process.platform === 'win32' ? 'bun.exe' : 'bun'
	const childProcess = spawn(
		bunExecutable,
		['run', '--silent', scriptName, '--', ...scriptArguments],
		{
			stdio: ['inherit', 'inherit', 'inherit'],
			env: process.env,
		},
	)
	return childProcess
}

function bindSignals(childProcess: ChildProcess) {
	let shuttingDown = false

	function forwardSignal(signal: NodeJS.Signals) {
		if (shuttingDown) return
		shuttingDown = true
		if (childProcess.exitCode === null) {
			childProcess.kill(signal)
		}
	}

	process.on('SIGINT', () => forwardSignal('SIGINT'))
	process.on('SIGTERM', () => forwardSignal('SIGTERM'))
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
