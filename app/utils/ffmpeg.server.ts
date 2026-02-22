import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import fsExtra from 'fs-extra'
import * as uuid from 'uuid'

const asset = (...p: Array<string>) =>
	path.join(process.cwd(), 'app/assets', ...p)
const cache = (...p: Array<string>) =>
	path.join(process.cwd(), '.cache/calls', ...p)

async function createEpisodeAudio(callAudio: Uint8Array, responseAudio: Uint8Array) {
	const id = uuid.v4()
	const cacheDir = cache(id)
	fsExtra.ensureDirSync(cacheDir)
	const callPath = cache(id, 'call.mp3')
	const responsePath = cache(id, 'response.mp3')
	const outputPath = cache(id, 'output.mp3')

	await fs.promises.writeFile(callPath, callAudio)
	await fs.promises.writeFile(responsePath, responseAudio)

	await new Promise((resolve, reject) => {
		const introPath = asset('call-kent/intro.mp3')
		const interstitialPath = asset('call-kent/interstitial.mp3')
		const outroPath = asset('call-kent/outro.mp3')
		const hasStitchAssets = [introPath, interstitialPath, outroPath].every((p) =>
			fs.existsSync(p),
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

						[noSilenceCall]loudnorm=I=-16:LRA=11:TP=0.0[call];
						[noSilenceResponse]loudnorm=I=-16:LRA=11:TP=0.0[response];

						[0][call]acrossfade=d=1:c2=nofade[a01];
						[a01][2]acrossfade=d=1:c1=nofade[a02];
						[a02][response]acrossfade=d=1:c2=nofade[a03];
						[a03][4]acrossfade=d=1:c1=nofade[out]
					`,
					'-map', '[out]',
					outputPath,
				]
			: [
					// Fallback for local/dev/CI environments where the intro/outro
					// assets are not present: stitch call + response only.
					'-i', callPath,
					'-i', responsePath,
					'-filter_complex', `
						[0]silenceremove=1:0:-50dB, silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB, loudnorm=I=-16:LRA=11:TP=0.0[call];
						[1]silenceremove=1:0:-50dB, silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB, loudnorm=I=-16:LRA=11:TP=0.0[response];
						[call][response]acrossfade=d=1:c1=nofade:c2=nofade[out]
					`,
					'-map', '[out]',
					outputPath,
				]
		spawn('ffmpeg', args, { stdio: 'inherit' }).on('close', (code) => {
			if (code === 0) resolve(null)
			else reject(null)
		})
	})

	const buffer = await fs.promises.readFile(outputPath)
	await fs.promises.rm(cacheDir, { recursive: true, force: true })
	return buffer
}

export { createEpisodeAudio }
