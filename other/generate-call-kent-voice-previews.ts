import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { callKentTextToSpeechVoices } from '#app/utils/call-kent-text-to-speech.ts'
import { synthesizeSpeechWithWorkersAi } from '#app/utils/cloudflare-ai-text-to-speech.server.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const outputDir = path.join(
	__dirname,
	'..',
	'public',
	'audio',
	'call-kent-voices',
)

function looksLikeBase64(value: string) {
	return /^[A-Za-z0-9+/]+=*$/u.test(value) && value.length >= 64
}

function sleep(ms: number) {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, ms)
	})
}

function isRetryableErrorMessage(message: string) {
	const m = message.toLowerCase()
	// Best-effort list of transient failures.
	return (
		m.includes('503') ||
		m.includes('service unavailable') ||
		m.includes('internal server error') ||
		m.includes('429') ||
		m.includes('too many requests') ||
		m.includes('etimedout') ||
		m.includes('econnreset') ||
		m.includes('fetch failed')
	)
}

async function synthesizeSpeechDirect({
	text,
	voice,
	model,
}: {
	text: string
	voice: string
	model: string
}): Promise<Uint8Array> {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
	const apiToken = process.env.CLOUDFLARE_API_TOKEN
	if (!accountId) throw new Error('Missing CLOUDFLARE_ACCOUNT_ID')
	if (!apiToken) throw new Error('Missing CLOUDFLARE_API_TOKEN')

	const apiBaseUrl =
		process.env.CLOUDFLARE_API_BASE_URL ?? 'https://api.cloudflare.com/client/v4'
	const url = `${apiBaseUrl}/accounts/${accountId}/ai/run/${model}`
	const lowerModel = model.toLowerCase()
	const payload =
		lowerModel.includes('deepgram/aura') || lowerModel.includes('aura-')
			? {
					text,
					// aura-2-en defaults to "luna", but allow callers to override.
					...(voice ? { speaker: voice } : {}),
					encoding: 'mp3',
				}
			: lowerModel.includes('melotts')
				? { prompt: text, lang: 'en' }
				: {
						text,
						...(voice ? { speaker: voice } : {}),
					}

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'Content-Type': 'application/json',
			Accept: 'audio/mpeg,application/json;q=0.9,*/*;q=0.8',
		},
		body: JSON.stringify(payload),
	})

	if (!res.ok) {
		const bodyText = await res.text().catch(() => '')
		throw new Error(
			`Direct Workers AI text-to-speech failed: ${res.status} ${res.statusText}${bodyText ? `\n${bodyText}` : ''}`,
		)
	}

	const contentTypeHeader = res.headers.get('content-type') ?? ''
	const contentTypeLower = contentTypeHeader.toLowerCase()
	const isJson =
		contentTypeLower.includes('application/json') ||
		contentTypeLower.includes('application/problem+json')
	const isAudio = contentTypeLower.startsWith('audio/')
	if (isAudio || !isJson) {
		return new Uint8Array(await res.arrayBuffer())
	}

	const json = (await res.json()) as any
	const unwrapped = (json?.result ?? json) as any
	const audioValue =
		typeof unwrapped?.audio === 'string'
			? unwrapped.audio
			: typeof unwrapped?.result === 'string'
				? (unwrapped.result as string)
				: null
	if (
		!audioValue ||
		typeof audioValue !== 'string' ||
		!looksLikeBase64(audioValue)
	) {
		throw new Error(
			`Direct Workers AI returned unexpected JSON for text-to-speech (model: ${model})`,
		)
	}
	return new Uint8Array(Buffer.from(audioValue, 'base64'))
}

function parseArgs(argv: string[]) {
	return {
		force: argv.includes('--force'),
	}
}

async function fileExists(filePath: string) {
	try {
		const s = await stat(filePath)
		return s.isFile()
	} catch {
		return false
	}
}

const previewScriptsByVoiceId: Record<string, string> = {
	apollo: `Apollo here. Fun fact: a day on Venus is longer than its year.`,
	arcas: `I'm Arcas. Octopuses have three hearts and blue blood.`,
	orion: `Orion speaking. Honey never spoils, even after thousands of years.`,
	luna: `Luna here. Bananas are berries, but strawberries aren't.`,
	andromeda: `Andromeda checking in. Your brain uses about 20% of your body's energy.`,
	helena: `Helena here. The Eiffel Tower grows about six inches taller in summer.`,
	athena: `Athena here. Fun fact: sharks are older than trees.`,
	zeus: `Zeus speaking. A group of flamingos is called a flamboyance.`,
}

function buildPreviewText(voiceId: string, voiceLabel: string) {
	return (
		previewScriptsByVoiceId[voiceId] ??
		`Hello, my name is ${voiceLabel} and this is what I sound like.`
	)
}

async function synthesizeSpeechWithFallback({
	text,
	voice,
	model,
}: {
	text: string
	voice: string
	model: string
}) {
	try {
		const res = await synthesizeSpeechWithWorkersAi({ text, voice, model })
		return res.bytes
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err)
		if (msg.includes('401 Unauthorized') || msg.includes('"Unauthorized"')) {
			console.warn(
				`gateway unauthorized for ${voice}; falling back to direct...`,
			)
			return await synthesizeSpeechDirect({ text, voice, model })
		}
		throw err
	}
}

async function main() {
	// This project validates NODE_ENV strictly. If a local `.env` uses something
	// like "local", force a safe default for this one-off script.
	const allowedNodeEnvs = new Set(['production', 'development', 'test'])
	if (!allowedNodeEnvs.has(process.env.NODE_ENV ?? '')) {
		process.env.NODE_ENV = 'development'
	}

	const { force } = parseArgs(process.argv.slice(2))

	await mkdir(outputDir, { recursive: true })

	let wroteCount = 0
	let skippedCount = 0
	const failures: Array<{ id: string; message: string }> = []

	for (const voice of callKentTextToSpeechVoices) {
		const outPath = path.join(outputDir, `${voice.id}.mp3`)
		if (!force && (await fileExists(outPath))) {
			skippedCount += 1
			// Keep output minimal; don't print any env vars.
			console.log(`skip ${voice.id} (exists)`)
			continue
		}

		const text = buildPreviewText(voice.id, voice.label)
		console.log(`generate ${voice.id}...`)
		const model =
			process.env.CLOUDFLARE_AI_TEXT_TO_SPEECH_MODEL?.trim() ||
			'@cf/deepgram/aura-2-en'

		try {
			const maxAttempts = 5
			let attempt = 0
			let bytes: Uint8Array | null = null
			while (attempt < maxAttempts) {
				attempt += 1
				try {
					bytes = await synthesizeSpeechWithFallback({
						text,
						voice: voice.id,
						model,
					})
					break
				} catch (err: unknown) {
					const msg = err instanceof Error ? err.message : String(err)
					if (!isRetryableErrorMessage(msg) || attempt === maxAttempts) {
						throw err
					}
					const delayMs = 500 * 2 ** (attempt - 1)
					console.warn(
						`retry ${voice.id} (attempt ${attempt}/${maxAttempts}) after ${delayMs}ms`,
					)
					await sleep(delayMs)
				}
			}

			if (!bytes) throw new Error('No audio bytes returned')
			await writeFile(outPath, Buffer.from(bytes))
			wroteCount += 1
			console.log(`wrote ${voice.id}`)
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err)
			failures.push({ id: voice.id, message: msg })
			console.error(`failed ${voice.id}: ${msg}`)
		}
	}

	if (failures.length > 0) {
		const summary = failures.map((f) => f.id).join(', ')
		throw new Error(`Failed to generate previews for: ${summary}`)
	}

	console.log(
		`done (wrote: ${wroteCount}, skipped: ${skippedCount}) -> ${outputDir}`,
	)
}

await main()
