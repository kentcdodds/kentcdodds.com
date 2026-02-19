#!/usr/bin/env node
import 'dotenv/config'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import getPort from 'get-port'

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getAvailablePort() {
	return await getPort()
}

async function run(command, args, { env } = {}) {
	const child = spawn(command, args, {
		stdio: 'inherit',
		env: env ?? process.env,
	})
	return await new Promise((resolve, reject) => {
		child.once('error', reject)
		child.once('exit', (code, signal) => {
			if (code === 0) resolve()
			else {
				reject(
					new Error(
						`${command} ${args.join(' ')} exited with code ${code ?? 'null'} (signal ${signal ?? 'null'})`,
					),
				)
			}
		})
	})
}

async function waitForOkResponse(url, { timeoutMs }) {
	const start = Date.now()
	let lastError = null
	while (Date.now() - start < timeoutMs) {
		const remaining = timeoutMs - (Date.now() - start)
		if (remaining <= 0) break

		try {
			const res = await fetch(url, {
				headers: { 'x-healthcheck': 'true' },
				// Prevent a hung request from bypassing the outer loop's timeout.
				signal: AbortSignal.timeout(Math.min(remaining, 5_000)),
			})
			const text = await res.text().catch(() => '')
			if (res.ok && text.trim() === 'OK') return
			lastError = new Error(
				`Unexpected response from ${url}: ${res.status} ${res.statusText} (${text.slice(0, 200)})`,
			)
		} catch (error) {
			lastError = error
		}
		await sleep(250)
	}
	throw lastError ?? new Error(`Timed out waiting for ${url}`)
}

async function main() {
	const rawTimeoutMs = process.env.HEALTHCHECK_TIMEOUT_MS?.trim()
	const parsedTimeoutMs = rawTimeoutMs ? Number(rawTimeoutMs) : NaN
	const timeoutMs =
		Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0
			? parsedTimeoutMs
			: 60_000
	const port = await getPort()
	const url = `http://127.0.0.1:${port}/healthcheck`

	// LiteFS is Fly-specific (FUSE + consul lease). For CI we smoke-test the
	// production build directly with a local SQLite DB + migrations applied.
	const env = {
		...process.env,
		NODE_ENV: 'production',
		PORT: String(port),
	}

	if (!process.env.DATABASE_URL) {
		throw new Error(
			'DATABASE_URL is required. In CI, copy `.env.example` to `.env` before running this script.',
		)
	}

	if (process.env.SKIP_MIGRATIONS !== 'true') {
		const prismaBin = path.join(
			process.cwd(),
			'node_modules',
			'.bin',
			process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
		)
		await run(prismaBin, ['migrate', 'deploy'], { env })
	}

	// Spawn the server directly (not via `npm start`) so we can reliably
	// terminate the whole process tree at the end of the smoke test.
	const server = spawn(process.execPath, ['./index.js'], {
		stdio: 'inherit',
		env,
		detached: true,
	})

	let serverExit = null
	server.once('exit', (code, signal) => {
		serverExit = { code, signal }
	})

	try {
		await waitForOkResponse(url, { timeoutMs })
		console.log(`✅ pre-deploy healthcheck OK: ${url}`)
	} finally {
		const killTree = (signal) => {
			if (!server.pid) return
			try {
				// Negative PID sends the signal to the entire process group.
				process.kill(-server.pid, signal)
			} catch {
				try {
					server.kill(signal)
				} catch {
					// ignore
				}
			}
		}

		// Try a graceful shutdown first; fall back to SIGKILL if needed.
		killTree('SIGINT')
		for (let i = 0; i < 40; i++) {
			if (serverExit) break
			await sleep(250)
		}
		if (!serverExit) killTree('SIGKILL')
	}
}

main().catch((error) => {
	console.error('❌ pre-deploy healthcheck failed', error)
	process.exit(1)
})
