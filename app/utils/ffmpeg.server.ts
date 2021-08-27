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
    '-i', 'intro.mp3',
    '-i', 'call.mp3',
    '-i', 'interstitial.mp3',
    '-i', 'response.mp3',
    '-i', 'outro.mp3',
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
      [a03][4]acrossfade=d=1:c1=nofade
    `,
    'output.mp3',
  )

  const outputData = ffmpeg.FS('readFile', 'output.mp3')
  const buffer = Buffer.from(outputData)
  return buffer
}

export {createEpisodeAudio}
