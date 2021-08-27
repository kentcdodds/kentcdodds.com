import path from 'path'
import {createFFmpeg, fetchFile} from '@ffmpeg/ffmpeg'

type FFMpeg = ReturnType<typeof createFFmpeg>

const asset = (...p: Array<string>) =>
  path.join(process.cwd(), 'app/assets', ...p)

declare global {
  // This prevents us from making multiple connections to the db when the
  // require cache is cleared.
  // eslint-disable-next-line
  var ffmpeg: FFMpeg | undefined
}

const ffmpeg = global.ffmpeg ?? (global.ffmpeg = createFFmpeg({log: true}))

async function createEpisodeAudio(callBase64: string, responseBase64: string) {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load()
  }

  ffmpeg.FS(
    'writeFile',
    'intro.mp3',
    await fetchFile(asset('call-kent/intro.mp3')),
  )
  ffmpeg.FS(
    'writeFile',
    'interstitial.mp3',
    await fetchFile(asset('call-kent/interstitial.mp3')),
  )
  ffmpeg.FS(
    'writeFile',
    'outro.mp3',
    await fetchFile(asset('call-kent/outro.mp3')),
  )

  ffmpeg.FS(
    'writeFile',
    'call.mp3',
    await fetchFile(Buffer.from(callBase64.split(',')[1]!, 'base64')),
  )
  ffmpeg.FS(
    'writeFile',
    'response.mp3',
    await fetchFile(Buffer.from(responseBase64.split(',')[1]!, 'base64')),
  )

  // prettier-ignore
  await ffmpeg.run(
    '-i', 'call.mp3',
    '-af', 'silenceremove=1:0:-50dB',
    'call1.mp3',
  )

  // prettier-ignore
  await ffmpeg.run(
    '-i', 'response.mp3',
    '-af', 'silenceremove=1:0:-50dB',
    'response1.mp3',
  )

  // prettier-ignore
  await ffmpeg.run(
    '-i', 'call1.mp3',
    '-af', 'silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB',
    'call2.mp3',
  )

  // prettier-ignore
  await ffmpeg.run(
    '-i', 'response1.mp3',
    '-af', 'silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB',
    'response2.mp3',
  )

  // prettier-ignore
  await ffmpeg.run(
    '-i', 'call2.mp3',
    '-af', 'loudnorm=I=-16:LRA=11:TP=0.0',
    'call3.mp3',
  )

  // prettier-ignore
  await ffmpeg.run(
    '-i', 'response2.mp3',
    '-af', 'loudnorm=I=-16:LRA=11:TP=0.0',
    'response3.mp3',
  )

  // prettier-ignore
  await ffmpeg.run(
    '-i', 'intro.mp3',
    '-i', 'call3.mp3',
    '-i', 'interstitial.mp3',
    '-i', 'response3.mp3',
    '-i', 'outro.mp3',
    '-filter_complex', `
[0][1]acrossfade=d=1:c2=nofade[a01];
[a01][2]acrossfade=d=1:c1=nofade[a02];
[a02][3]acrossfade=d=1:c2=nofade[a03];
[a03][4]acrossfade=d=1:c1=nofade
    `,
    'output.mp3',
  )

  const outputData = ffmpeg.FS('readFile', 'output.mp3')
  const buffer = Buffer.from(outputData)
  return buffer
}

export {createEpisodeAudio}
