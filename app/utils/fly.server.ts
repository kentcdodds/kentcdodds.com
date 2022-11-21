import fs from 'fs'
import os from 'os'
import path from 'path'
import invariant from 'tiny-invariant'

export async function ensurePrimary() {
  const {currentIsPrimary, currentInstance, primaryInstance} =
    await getInstanceInfo()

  if (!currentIsPrimary) {
    console.log(
      `Instance (${currentInstance}) in ${process.env.FLY_REGION} is not primary (primary is: ${primaryInstance}), sending fly replay response`,
    )
    throw new Response('Fly Replay', {
      status: 409,
      headers: {'fly-replay': `instance=${primaryInstance}`},
    })
  }
}

export async function getInstanceInfo() {
  const currentInstance = os.hostname()
  let primaryInstance
  try {
    const {FLY_LITEFS_DIR} = process.env
    invariant(FLY_LITEFS_DIR, 'FLY_LITEFS_DIR is not defined')
    primaryInstance = await fs.promises.readFile(
      path.join(FLY_LITEFS_DIR, '.primary'),
      'utf8',
    )
    primaryInstance = primaryInstance.trim()
  } catch (error: unknown) {
    primaryInstance = currentInstance
  }
  return {
    primaryInstance,
    currentInstance,
    currentIsPrimary: currentInstance === primaryInstance,
  }
}

export async function getFlyReplayResponse(instance?: string) {
  return new Response('Fly Replay', {
    status: 409,
    headers: {
      'fly-replay': `instance=${
        instance ?? (await getInstanceInfo()).primaryInstance
      }`,
    },
  })
}
