import { createServer } from 'node:http'
import { once } from 'node:events'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { afterEach, expect, test } from 'vitest'

const tempPaths: Array<string> = []

afterEach(async () => {
	await Promise.all(
		tempPaths.splice(0).map((tempPath) =>
			fs.rm(tempPath, { recursive: true, force: true }),
		),
	)
})

function runCommand(command: string, args: Array<string>, env?: NodeJS.ProcessEnv) {
	return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
		const child = spawn(command, args, {
			env: env ? { ...process.env, ...env } : process.env,
			stdio: ['ignore', 'pipe', 'pipe'],
		})
		let stdout = ''
		let stderr = ''
		child.stdout.on('data', (chunk) => {
			stdout += String(chunk)
		})
		child.stderr.on('data', (chunk) => {
			stderr += String(chunk)
		})
		child.once('error', reject)
		child.once('close', (code) => {
			if (code === 0) resolve({ stdout, stderr })
			else {
				reject(
					new Error(
						`${command} ${args.join(' ')} failed with exit code ${String(code)}\n${stderr}`,
					),
				)
			}
		})
	})
}

async function createFixtureMp3({
	filePath,
	durationSeconds,
	frequencyHz,
	env,
}: {
	filePath: string
	durationSeconds: number
	frequencyHz: number
	env?: NodeJS.ProcessEnv
}) {
	await runCommand(
		'ffmpeg',
		[
			'-hide_banner',
			'-loglevel',
			'error',
			'-f',
			'lavfi',
			'-i',
			`sine=frequency=${String(frequencyHz)}:duration=${String(durationSeconds)}`,
			'-q:a',
			'4',
			'-y',
			filePath,
		],
		env,
	)
}

async function createMockMediaTools(tempRoot: string) {
	const binDir = path.join(tempRoot, 'bin')
	await fs.mkdir(binDir, { recursive: true })
	const ffmpegPath = path.join(binDir, 'ffmpeg')
	const ffprobePath = path.join(binDir, 'ffprobe')

	await fs.writeFile(
		ffmpegPath,
		`#!/usr/bin/env bash
set -euo pipefail

args=("$@")
outputs=()

for ((i=0; i<\${#args[@]}; i++)); do
	if [[ "\${args[$i]}" == "-map" ]]; then
		output_index=$((i + 2))
		if (( output_index < \${#args[@]} )); then
			outputs+=("\${args[$output_index]}")
		fi
	fi
done

if (( \${#outputs[@]} == 0 )) && (( \${#args[@]} > 0 )); then
	last_index=$((\${#args[@]} - 1))
	outputs+=("\${args[$last_index]}")
fi

for output in "\${outputs[@]}"; do
	mkdir -p "$(dirname "$output")"
	printf 'fake mp3 for %s\n' "$output" > "$output"
done
`,
	)

	await fs.writeFile(
		ffprobePath,
		`#!/usr/bin/env bash
set -euo pipefail

target_path="\${@: -1}"
if [[ ! -f "$target_path" ]]; then
	printf 'missing file: %s\n' "$target_path" >&2
	exit 1
fi
`,
	)

	await Promise.all([fs.chmod(ffmpegPath, 0o755), fs.chmod(ffprobePath, 0o755)])

	return {
		PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
	}
}

test(
	'call-kent-audio-cli stitches and uploads episode audio with local fixtures',
	async () => {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), 'call-kent-audio-cli-'),
	)
	tempPaths.push(tempRoot)

	const assetsDir = path.join(tempRoot, 'assets')
	const uploadsDir = path.join(tempRoot, 'uploads')
	const mediaToolEnv = await createMockMediaTools(tempRoot)
	await fs.mkdir(assetsDir, { recursive: true })
	await fs.mkdir(uploadsDir, { recursive: true })

	await createFixtureMp3({
		filePath: path.join(assetsDir, 'intro.mp3'),
		durationSeconds: 1.2,
		frequencyHz: 220,
		env: mediaToolEnv,
	})
	await createFixtureMp3({
		filePath: path.join(assetsDir, 'interstitial.mp3'),
		durationSeconds: 1.1,
		frequencyHz: 330,
		env: mediaToolEnv,
	})
	await createFixtureMp3({
		filePath: path.join(assetsDir, 'outro.mp3'),
		durationSeconds: 1.2,
		frequencyHz: 440,
		env: mediaToolEnv,
	})
	await createFixtureMp3({
		filePath: path.join(tempRoot, 'call.mp3'),
		durationSeconds: 2.2,
		frequencyHz: 550,
		env: mediaToolEnv,
	})
	await createFixtureMp3({
		filePath: path.join(tempRoot, 'response.mp3'),
		durationSeconds: 2.3,
		frequencyHz: 660,
		env: mediaToolEnv,
	})

	const uploadedFiles = new Map<string, string>()
	const server = createServer(async (request, response) => {
		if (!request.url) {
			response.statusCode = 400
			response.end('missing url')
			return
		}

		const url = new URL(request.url, 'http://127.0.0.1')
		if (request.method === 'GET' && url.pathname === '/call.mp3') {
			response.setHeader('Content-Type', 'audio/mpeg')
			response.end(await fs.readFile(path.join(tempRoot, 'call.mp3')))
			return
		}
		if (request.method === 'GET' && url.pathname === '/response.mp3') {
			response.setHeader('Content-Type', 'audio/mpeg')
			response.end(await fs.readFile(path.join(tempRoot, 'response.mp3')))
			return
		}
		if (request.method === 'PUT' && url.pathname.startsWith('/uploads/')) {
			const outputPath = path.join(
				uploadsDir,
				path.basename(url.pathname),
			)
			const chunks: Array<Buffer> = []
			for await (const chunk of request) {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
			}
			await fs.writeFile(outputPath, Buffer.concat(chunks))
			uploadedFiles.set(path.basename(outputPath), outputPath)
			response.statusCode = 200
			response.end('ok')
			return
		}

		response.statusCode = 404
		response.end('not found')
	})

	server.listen(0, '127.0.0.1')
	await once(server, 'listening')

	try {
		const address = server.address()
		if (!address || typeof address === 'string') {
			throw new Error('Failed to resolve local test server address')
		}
		const baseUrl = `http://127.0.0.1:${String(address.port)}`
		const scriptPath = path.join(
			process.cwd(),
			'sandbox',
			'call-kent-audio-cli.sh',
		)

		const { stdout, stderr } = await runCommand('bash', [scriptPath], {
			CALL_KENT_AUDIO_DRAFT_ID: 'draft-123',
			CALL_KENT_AUDIO_ATTEMPT: '1',
			CALL_KENT_AUDIO_ASSETS_DIR: assetsDir,
			CALL_AUDIO_URL: `${baseUrl}/call.mp3`,
			RESPONSE_AUDIO_URL: `${baseUrl}/response.mp3`,
			EPISODE_UPLOAD_URL: `${baseUrl}/uploads/episode.mp3`,
			CALLER_SEGMENT_UPLOAD_URL: `${baseUrl}/uploads/caller-segment.mp3`,
			RESPONSE_SEGMENT_UPLOAD_URL: `${baseUrl}/uploads/response-segment.mp3`,
			...mediaToolEnv,
		})

		expect(stderr).toContain('Running FFmpeg stitching pipeline')
		const parsed = JSON.parse(stdout.trim()) as {
			episodeAudioSize: number
			callerSegmentAudioSize: number
			responseSegmentAudioSize: number
		}
		expect(parsed.episodeAudioSize).toBeGreaterThan(0)
		expect(parsed.callerSegmentAudioSize).toBeGreaterThan(0)
		expect(parsed.responseSegmentAudioSize).toBeGreaterThan(0)
		expect(Array.from(uploadedFiles.keys()).sort()).toEqual([
			'caller-segment.mp3',
			'episode.mp3',
			'response-segment.mp3',
		])

		await runCommand(
			'ffprobe',
			[
				'-hide_banner',
				'-loglevel',
				'error',
				uploadedFiles.get('episode.mp3')!,
			],
			mediaToolEnv,
		)
	} finally {
		server.closeAllConnections?.()
		server.close()
		await once(server, 'close')
	}
	},
	30_000,
)

test('call-kent-audio-cli fails fast when a required env var is missing', async () => {
	const scriptPath = path.join(
		process.cwd(),
		'sandbox',
		'call-kent-audio-cli.sh',
	)

	await expect(
		runCommand('bash', [scriptPath], {
			CALL_KENT_AUDIO_ATTEMPT: '1',
			CALL_KENT_AUDIO_ASSETS_DIR: '/tmp/does-not-matter',
			CALL_AUDIO_URL: 'http://127.0.0.1/call.mp3',
			RESPONSE_AUDIO_URL: 'http://127.0.0.1/response.mp3',
			EPISODE_UPLOAD_URL: 'http://127.0.0.1/uploads/episode.mp3',
			CALLER_SEGMENT_UPLOAD_URL: 'http://127.0.0.1/uploads/caller.mp3',
			RESPONSE_SEGMENT_UPLOAD_URL: 'http://127.0.0.1/uploads/response.mp3',
		}),
	).rejects.toThrow(/Missing required env var: CALL_KENT_AUDIO_DRAFT_ID/)
})

test('call-kent-audio-cli fails when an input download returns 404', async () => {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), 'call-kent-audio-cli-missing-download-'),
	)
	tempPaths.push(tempRoot)

	const assetsDir = path.join(tempRoot, 'assets')
	const mediaToolEnv = await createMockMediaTools(tempRoot)
	await fs.mkdir(assetsDir, { recursive: true })
	await createFixtureMp3({
		filePath: path.join(assetsDir, 'intro.mp3'),
		durationSeconds: 1.2,
		frequencyHz: 220,
		env: mediaToolEnv,
	})
	await createFixtureMp3({
		filePath: path.join(assetsDir, 'interstitial.mp3'),
		durationSeconds: 1.1,
		frequencyHz: 330,
		env: mediaToolEnv,
	})
	await createFixtureMp3({
		filePath: path.join(assetsDir, 'outro.mp3'),
		durationSeconds: 1.2,
		frequencyHz: 440,
		env: mediaToolEnv,
	})

	const server = createServer((_request, response) => {
		response.statusCode = 404
		response.end('missing')
	})

	server.listen(0, '127.0.0.1')
	await once(server, 'listening')

	try {
		const address = server.address()
		if (!address || typeof address === 'string') {
			throw new Error('Failed to resolve local test server address')
		}
		const baseUrl = `http://127.0.0.1:${String(address.port)}`
		const scriptPath = path.join(
			process.cwd(),
			'sandbox',
			'call-kent-audio-cli.sh',
		)

		await expect(
			runCommand('bash', [scriptPath], {
				CALL_KENT_AUDIO_DRAFT_ID: 'draft-404',
				CALL_KENT_AUDIO_ATTEMPT: '1',
				CALL_KENT_AUDIO_ASSETS_DIR: assetsDir,
				CALL_AUDIO_URL: `${baseUrl}/call.mp3`,
				RESPONSE_AUDIO_URL: `${baseUrl}/response.mp3`,
				EPISODE_UPLOAD_URL: `${baseUrl}/uploads/episode.mp3`,
				CALLER_SEGMENT_UPLOAD_URL: `${baseUrl}/uploads/caller-segment.mp3`,
				RESPONSE_SEGMENT_UPLOAD_URL: `${baseUrl}/uploads/response-segment.mp3`,
				...mediaToolEnv,
			}),
		).rejects.toThrow(/404/)
	} finally {
		server.closeAllConnections?.()
		server.close()
		await once(server, 'close')
	}
})
