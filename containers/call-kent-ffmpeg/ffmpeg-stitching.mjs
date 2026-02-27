import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/**
 * Stitch caller + responder audio into normalized episode segments.
 * Returns standalone caller/responder tracks plus the final stitched episode.
 */
export async function stitchEpisodeAudio({
	callAudio,
	responseAudio,
}) {
	const workDir = path.join(os.tmpdir(), `call-kent-ffmpeg-${randomUUID()}`)
	await fs.mkdir(workDir, { recursive: true })

	const callPath = path.join(workDir, 'call.mp3')
	const responsePath = path.join(workDir, 'response.mp3')
	const callOutPath = path.join(workDir, 'call.normalized.mp3')
	const responseOutPath = path.join(workDir, 'response.normalized.mp3')
	const episodeOutPath = path.join(workDir, 'episode.mp3')

	try {
		await fs.writeFile(callPath, callAudio)
		await fs.writeFile(responsePath, responseAudio)

		const args = [
			'-i',
			callPath,
			'-i',
			responsePath,
			'-filter_complex',
			`
				[0]silenceremove=1:0:-50dB, silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB, loudnorm=I=-16:LRA=11:TP=0.0[call0];
				[1]silenceremove=1:0:-50dB, silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB, loudnorm=I=-16:LRA=11:TP=0.0[response0];

				[call0]asplit=2[callForEpisode][callForStandalone];
				[response0]asplit=2[responseForEpisode][responseForStandalone];

				[callForEpisode][responseForEpisode]acrossfade=d=1:c1=nofade:c2=nofade[out]
			`,
			'-map',
			'[callForStandalone]',
			callOutPath,
			'-map',
			'[responseForStandalone]',
			responseOutPath,
			'-map',
			'[out]',
			episodeOutPath,
		]

		await runFfmpeg(args)

		const [callerMp3, responseMp3, episodeMp3] = await Promise.all([
			fs.readFile(callOutPath),
			fs.readFile(responseOutPath),
			fs.readFile(episodeOutPath),
		])

		return { callerMp3, responseMp3, episodeMp3 }
	} finally {
		await fs.rm(workDir, { recursive: true, force: true }).catch(() => {})
	}
}

function runFfmpeg(args) {
	return new Promise((resolve, reject) => {
		const child = spawn('ffmpeg', args, { stdio: 'inherit' })
		child.once('error', reject)
		child.once('close', (code) => {
			if (code === 0) resolve()
			else reject(new Error(`ffmpeg exited with code ${code ?? 1}`))
		})
	})
}
