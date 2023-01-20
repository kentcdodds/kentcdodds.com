import fs from 'fs'
import dns from 'dns'
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

export async function ensureInstance(instance: string) {
  const {currentInstance} = await getInstanceInfo()
  if (process.env.FLY && instance !== currentInstance) {
    throw new Response('Fly Replay', {
      status: 409,
      headers: {
        'fly-replay': `instance=${instance}`,
      },
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

export async function getAllInstances() {
  try {
    const rawTxts = await dns.promises.resolveTxt(`vms.kcd.internal`)
    const instances = rawTxts
      .flat()
      .flatMap(r => r.split(','))
      .map(vm => vm.split(' '))
      .reduce<Record<string, string>>(
        (all, [instanceId, region]) =>
          instanceId && region ? {...all, [instanceId]: region} : all,
        {},
      )
    return instances
  } catch (error: unknown) {
    console.error('Error getting all instances', error)
    return {[process.env.FLY_REGION ?? 'local']: os.hostname()}
  }
}

export async function getTXNumber() {
  if (!process.env.FLY) return 0

  const {FLY_LITEFS_DIR, DATABASE_FILENAME} = process.env
  invariant(FLY_LITEFS_DIR, 'FLY_LITEFS_DIR is not defined')
  invariant(DATABASE_FILENAME, 'DATABASE_FILENAME is not defined')
  let dbPos = '0'
  try {
    dbPos = await fs.promises.readFile(
      path.join(FLY_LITEFS_DIR, `${DATABASE_FILENAME}-pos`),
      'utf-8',
    )
  } catch {
    // ignore
  }
  return parseInt(dbPos.trim().split('/')[0] ?? '0', 16)
}
