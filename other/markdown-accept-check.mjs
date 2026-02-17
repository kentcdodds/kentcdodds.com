import { spawn } from 'node:child_process'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const defaultPort = 4789
const port = Number(process.env.PORT || process.env.MARKDOWN_ACCEPT_TEST_PORT || defaultPort)

const repoRoot = process.cwd()
const tsxPath = path.join(repoRoot, 'node_modules', '.bin', 'tsx')

function startServer() {
	const env = {
		...process.env,
		DOTENV_CONFIG_PATH: process.env.DOTENV_CONFIG_PATH ?? '.env.example',
		NODE_ENV: process.env.NODE_ENV ?? 'development',
		MOCKS: process.env.MOCKS ?? 'true',
		PORT: String(port),
		STARTUP_SHORTCUTS: process.env.STARTUP_SHORTCUTS ?? 'false',
		REMIX_DEV_HTTP_ORIGIN:
			process.env.REMIX_DEV_HTTP_ORIGIN ?? `http://localhost:${port}`,
	}

	const child = spawn(tsxPath, ['./index.js'], {
		stdio: ['ignore', 'pipe', 'pipe'],
		env,
	})

	let localUrl = null
	let stdout = ''

	child.stdout.on('data', (chunk) => {
		const text = chunk.toString()
		stdout += text
		process.stdout.write(text)

		if (!localUrl) {
			const cleaned = text.replace(/\x1b\[[0-9;]*m/g, '')
			const match = cleaned.match(/Local:\s+(\S+)/)
			if (match?.[1]) localUrl = match[1]
		}
	})

	child.stderr.on('data', (chunk) => {
		process.stderr.write(chunk)
	})

	return { child, getLocalUrl: () => localUrl, getStdout: () => stdout }
}

async function waitForLocalUrl(getLocalUrl, getStdout, timeoutMs = 60_000) {
	const start = Date.now()
	while (!getLocalUrl()) {
		if (Date.now() - start > timeoutMs) {
			throw new Error(
				`Timed out waiting for Local URL. Output so far:\n${getStdout()}`,
			)
		}
		await delay(100)
	}
	return getLocalUrl()
}

async function fetchWithRetry(url, init, { attempts = 30, delayMs = 250 } = {}) {
	let lastError
	for (let i = 0; i < attempts; i++) {
		try {
			return await fetch(url, init)
		} catch (e) {
			lastError = e
			await delay(delayMs)
		}
	}
	throw lastError
}

async function assertMarkdownResponse(baseUrl, pathname, expectedNeedle) {
	const url = `${baseUrl}${pathname}`
	const res = await fetchWithRetry(url, {
		headers: { Accept: 'text/markdown' },
	})
	const contentType = res.headers.get('content-type') ?? ''
	const vary = res.headers.get('vary') ?? ''
	const body = await res.text()

	if (res.status !== 200) {
		throw new Error(
			`${pathname}: expected 200, got ${res.status}. Body starts with: ${body.slice(0, 200)}`,
		)
	}
	if (!contentType.toLowerCase().includes('text/markdown')) {
		throw new Error(
			`${pathname}: expected content-type to include text/markdown, got ${contentType}`,
		)
	}
	if (!vary.toLowerCase().includes('accept')) {
		throw new Error(`${pathname}: expected vary to include Accept, got ${vary}`)
	}
	if (!body.includes(expectedNeedle)) {
		throw new Error(
			`${pathname}: expected body to include ${JSON.stringify(expectedNeedle)}. Body starts with: ${body.slice(0, 200)}`,
		)
	}

	console.log(`\nOK: ${pathname} -> ${contentType}`)
}

const { child, getLocalUrl, getStdout } = startServer()

try {
	const baseUrl = await waitForLocalUrl(getLocalUrl, getStdout)
	await assertMarkdownResponse(baseUrl, '/about-mcp', 'title: About KCD MCP')
	await assertMarkdownResponse(
		baseUrl,
		'/blog/aha-programming',
		'title: AHA Programming',
	)
} catch (error) {
	console.error('\nmarkdown-accept-check failed:', error)
	process.exitCode = 1
} finally {
	child.kill('SIGTERM')
	const exited = await Promise.race([
		new Promise((resolve) => child.once('exit', () => resolve(true))),
		delay(5_000).then(() => false),
	])
	if (!exited) child.kill('SIGKILL')
}

