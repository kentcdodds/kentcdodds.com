import { spawn } from 'child_process'
import fs from 'fs'
import { Buffer } from 'node:buffer'
import path from 'path'
import fsExtra from 'fs-extra'
import * as uuid from 'uuid'
import { getEnv } from '#app/utils/env.server.ts'

const asset = (...p: Array<string>) =>
	path.join(process.cwd(), 'app/assets', ...p)
const cache = (...p: Array<string>) =>
	path.join(process.cwd(), '.cache/calls', ...p)

async function createEpisodeAudio(
	callAudio: Uint8Array,
	responseAudio: Uint8Array,
) {
	const containerBaseUrl = getCallKentFfmpegContainerBaseUrl()
	if (containerBaseUrl) {
		return createEpisodeAudioInContainer({
			containerBaseUrl,
			callAudio,
			responseAudio,
		})
	}

	return createEpisodeAudioLocally(callAudio, responseAudio)
}

function getCallKentFfmpegContainerBaseUrl() {
	const value = getEnv().CALL_KENT_FFMPEG_CONTAINER_BASE_URL?.trim()
	if (!value) return null
	return value.replace(/\/+$/, '')
}

async function createEpisodeAudioInContainer({
	containerBaseUrl,
	callAudio,
	responseAudio,
}: {
	containerBaseUrl: string
	callAudio: Uint8Array
	responseAudio: Uint8Array
}) {
	const callAudioBody =
		callAudio.buffer instanceof ArrayBuffer
			? new Uint8Array(callAudio.buffer, callAudio.byteOffset, callAudio.byteLength)
			: Uint8Array.from(callAudio)
	const responseAudioBody =
		responseAudio.buffer instanceof ArrayBuffer
			? new Uint8Array(
					responseAudio.buffer,
					responseAudio.byteOffset,
					responseAudio.byteLength,
				)
			: Uint8Array.from(responseAudio)

	const body = new FormData()
	body.append(
		'callAudio',
		new Blob([callAudioBody], { type: 'audio/mpeg' }),
		'call.mp3',
	)
	body.append(
		'responseAudio',
		new Blob([responseAudioBody], { type: 'audio/mpeg' }),
		'response.mp3',
	)

	const response = await fetch(`${containerBaseUrl}/episode-audio`, {
		method: 'POST',
		body,
	})
	if (!response.ok) {
		const responseBody = await response.text().catch(() => '')
		throw new Error(
			`Container ffmpeg request failed: ${response.status} ${response.statusText}${responseBody ? `\n${responseBody}` : ''}`,
		)
	}

	const payload = (await response.json()) as {
		callerMp3Base64?: string
		responseMp3Base64?: string
		episodeMp3Base64?: string
	}
	return {
		callerMp3: decodeBase64Audio(payload.callerMp3Base64, 'callerMp3Base64'),
		responseMp3: decodeBase64Audio(
			payload.responseMp3Base64,
			'responseMp3Base64',
		),
		episodeMp3: decodeBase64Audio(payload.episodeMp3Base64, 'episodeMp3Base64'),
	}
}

function decodeBase64Audio(value: unknown, field: string) {
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`Container ffmpeg response missing ${field}`)
	}
	return Buffer.from(value, 'base64')
}

async function createEpisodeAudioLocally(
	callAudio: Uint8Array,
	responseAudio: Uint8Array,
) {
	const id = uuid.v4()
	const cacheDir = cache(id)
	fsExtra.ensureDirSync(cacheDir)
	const callPath = cache(id, 'call.mp3')
	const responsePath = cache(id, 'response.mp3')
	const callOutPath = cache(id, 'call.normalized.mp3')
	const responseOutPath = cache(id, 'response.normalized.mp3')
	const episodeOutPath = cache(id, 'episode.mp3')

	await fs.promises.writeFile(callPath, callAudio)
	await fs.promises.writeFile(responsePath, responseAudio)

	await new Promise((resolve, reject) => {
		const introPath = asset('call-kent/intro.mp3')
		const interstitialPath = asset('call-kent/interstitial.mp3')
		const outroPath = asset('call-kent/outro.mp3')
		const hasStitchAssets = [introPath, interstitialPath, outroPath].every(
			(p) => fs.existsSync(p),
		)

		// prettier-ignore
		const args = hasStitchAssets
			? [
					'-i', introPath,
					'-i', callPath,
					'-i', interstitialPath,
					'-i', responsePath,
					'-i', outroPath,
					'-filter_complex', `
						[1]silenceremove=1:0:-50dB[trimmedCall];
						[3]silenceremove=1:0:-50dB[trimmedResponse];

						[trimmedCall]silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB[noSilenceCall];
						[trimmedResponse]silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB[noSilenceResponse];

						[noSilenceCall]loudnorm=I=-16:LRA=11:TP=0.0[call0];
						[noSilenceResponse]loudnorm=I=-16:LRA=11:TP=0.0[response0];

						[call0]asplit=2[callForEpisode][callForStandalone];
						[response0]asplit=2[responseForEpisode][responseForStandalone];

						[0][callForEpisode]acrossfade=d=1:c2=nofade[a01];
						[a01][2]acrossfade=d=1:c1=nofade[a02];
						[a02][responseForEpisode]acrossfade=d=1:c2=nofade[a03];
						[a03][4]acrossfade=d=1:c1=nofade[out]
					`,
					'-map', '[callForStandalone]',
					callOutPath,
					'-map', '[responseForStandalone]',
					responseOutPath,
					'-map', '[out]',
					episodeOutPath,
				]
			: [
					// Fallback for local/dev/CI environments where the intro/outro
					// assets are not present: stitch call + response only.
					'-i', callPath,
					'-i', responsePath,
					'-filter_complex', `
						[0]silenceremove=1:0:-50dB, silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB, loudnorm=I=-16:LRA=11:TP=0.0[call0];
						[1]silenceremove=1:0:-50dB, silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB, loudnorm=I=-16:LRA=11:TP=0.0[response0];

						[call0]asplit=2[callForEpisode][callForStandalone];
						[response0]asplit=2[responseForEpisode][responseForStandalone];

						[callForEpisode][responseForEpisode]acrossfade=d=1:c1=nofade:c2=nofade[out]
					`,
					'-map', '[callForStandalone]',
					callOutPath,
					'-map', '[responseForStandalone]',
					responseOutPath,
					'-map', '[out]',
					episodeOutPath,
				]
		spawn('ffmpeg', args, { stdio: 'inherit' }).on('close', (code) => {
			if (code === 0) resolve(null)
			else reject(null)
		})
	})

	const [callerMp3, responseMp3, episodeMp3] = await Promise.all([
		fs.promises.readFile(callOutPath),
		fs.promises.readFile(responseOutPath),
		fs.promises.readFile(episodeOutPath),
	])
	await fs.promises.rm(cacheDir, { recursive: true, force: true })
	return { callerMp3, responseMp3, episodeMp3 }
}

export { createEpisodeAudio }
