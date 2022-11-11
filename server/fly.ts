import os from 'os'
import fs from 'fs'
import type {RequestHandler} from 'express'

export const getReplayResponse: RequestHandler = function getReplayResponse(
  req,
  res,
  next,
) {
  const {method, path: pathname} = req
  if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') {
    return next()
  }

  const {currentInstance, currentIsPrimary, primaryInstance} = getInstanceInfo()
  if (!process.env.FLY || currentIsPrimary) return next()

  if (pathname.includes('__metronome')) {
    // metronome doesn't need to be replayed...
    return next()
  }

  const logInfo = {
    pathname,
    method,
    currentInstance,
    currentIsPrimary,
    primaryInstance,
  }
  console.info(`Replaying:`, logInfo)
  res.set('fly-replay', `instance=${primaryInstance}`)
  return res.sendStatus(409)
}

export function getInstanceInfo() {
  const currentInstance = os.hostname()
  let primaryInstance
  try {
    primaryInstance = fs.readFileSync('/litefs/data/.primary', 'utf8')
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
