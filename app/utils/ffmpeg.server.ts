import fs from 'fs'
import {spawn} from 'child_process'
import path from 'path'
import * as uuid from 'uuid'
import fsExtra from 'fs-extra'

const asset = (...p: Array<string>) =>
  path.join(process.cwd(), 'app/assets', ...p)
const cache = (...p: Array<string>) =>
  path.join(process.cwd(), '.cache/calls', ...p)

async function createEpisodeAudio(callBase64: string, responseBase64: string) {
  const id = uuid.v4()
  const cacheDir = cache(id)
  fsExtra.ensureDirSync(cacheDir)
  const callPath = cache(id, 'call.mp3')
  const responsePath = cache(id, 'response.mp3')
  const outputPath = cache(id, 'output.mp3')

  const callBuffer = Buffer.from(callBase64.split(',')[1]!, 'base64')
  const responseBuffer = Buffer.from(responseBase64.split(',')[1]!, 'base64')

  await fs.promises.writeFile(callPath, callBuffer)
  await fs.promises.writeFile(responsePath, responseBuffer)

  await new Promise((resolve, reject) => {
    // prettier-ignore
    const args = [
      '-i', asset('call-kent/intro.mp3'),
      '-i', callPath,
      '-i', asset('call-kent/interstitial.mp3'),
      '-i', responsePath,
      '-i', asset('call-kent/outro.mp3'),
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
      outputPath,
    ]
    spawn('ffmpeg', args, {stdio: 'inherit'}).on('close', code => {
      if (code === 0) resolve(null)
      else reject(null)
    })
  })

  const buffer = await fs.promises.readFile(outputPath)
  await fs.promises.rmdir(cacheDir, {recursive: true})
  return buffer
}

export {createEpisodeAudio}
