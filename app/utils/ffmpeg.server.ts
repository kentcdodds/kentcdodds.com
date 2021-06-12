import path from 'path'
import type {FFmpeg} from '@ffmpeg/ffmpeg'
import {createFFmpeg, fetchFile} from '@ffmpeg/ffmpeg'

const asset = (...p: Array<string>) =>
  path.join(process.cwd(), 'app/assets', ...p)

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      ffmpeg?: FFmpeg
    }
  }
}
const ffmpeg = getFFmpeg()

function getFFmpeg() {
  if (process.env.NODE_ENV === 'production') {
    return createFFmpeg()
  }
  if (global.ffmpeg) return global.ffmpeg
  global.ffmpeg = createFFmpeg({log: true})
  return global.ffmpeg
}

async function createEpisodeAudio(callBase64: string, responseBase64: string) {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load()
  }

  ffmpeg.FS(
    'writeFile',
    'call-kent-intro.mp3',
    await fetchFile(asset('call-kent-intro.mp3')),
  )
  ffmpeg.FS(
    'writeFile',
    'call-kent-interlude.mp3',
    await fetchFile(asset('call-kent-interlude.mp3')),
  )
  ffmpeg.FS(
    'writeFile',
    'call-kent-outro.mp3',
    await fetchFile(asset('call-kent-outro.mp3')),
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
    ...[
      '-i', 'call-kent-intro.mp3',
      '-i', 'call.mp3',
      '-i', 'call-kent-interlude.mp3',
      '-i', 'response.mp3',
      '-i', 'call-kent-outro.mp3',
      '-filter_complex', '[0:a][1:a]concat=n=5:v=0:a=1',
      'output.mp3',
    ],
  )

  const outputData = ffmpeg.FS('readFile', 'output.mp3')
  return Buffer.from(outputData)
}

export {createEpisodeAudio}
