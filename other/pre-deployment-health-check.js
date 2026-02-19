#!/usr/bin/env node
import 'dotenv/config'
import { spawn } from 'node:child_process'
import net from 'node:net'
import process from 'node:process'

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getAvailablePort() {
	return await new Promise((resolve, reject) => {
		const server = net.createServer()
		server.once('error', reject)
		server.listen(0, '127.0.0.1', () => {
			const address = server.address()
			if (!address || typeof address === 'string') {
				reject(new Error('Unable to determine an available port'))
				return
			}
			server.close(() => resolve(address.port))
		})
	})
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
		try {
			const res = await fetch(url, {
				headers: { 'x-healthcheck': 'true' },
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
	const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS ?? 60_000)
	const port = await getAvailablePort()
	const url = `http://127.0.0.1:${port}/healthcheck`

	// LiteFS is Fly-specific (FUSE + consul lease). For CI we smoke-test the
	// production build directly with a local SQLite DB + migrations applied.
	const env = {
		...process.env,
		NODE_ENV: 'production',
		PORT: String(port),
		SENTRY_DSN: '', // keep the smoke test fast and avoid external calls
	}

	if (!process.env.DATABASE_URL) {
		throw new Error(
			'DATABASE_URL is required. In CI, copy `.env.example` to `.env` before running this script.',
		)
	}

	if (process.env.SKIP_MIGRATIONS !== 'true') {
		await run('npx', ['prisma@7', 'migrate', 'deploy'], { env })
	}

	const server = spawn('npm', ['start'], {
		stdio: 'inherit',
		env,
	})

	let serverExit = null
	server.once('exit', (code, signal) => {
		serverExit = { code, signal }
	})

	try {
		await waitForOkResponse(url, { timeoutMs })
		console.error(`✅ pre-deploy healthcheck OK: ${url}`)
	} finally {
		// Try a graceful shutdown first; fall back to SIGKILL if needed.
		server.kill('SIGINT')
		for (let i = 0; i < 40; i++) {
			if (serverExit) break
			await sleep(250)
		}
		if (!serverExit) server.kill('SIGKILL')
	}
}

main().catch((error) => {
	console.error('❌ pre-deploy healthcheck failed', error)
	process.exit(1)
})
