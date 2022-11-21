import os from 'os'
import fs from 'fs'
import type {RequestHandler} from 'express'
import path from 'path'
import cookie from 'cookie'
import invariant from 'tiny-invariant'
import chokidar from 'chokidar'
import EventEmitter from 'events'

export const getReplayResponse: RequestHandler = function getReplayResponse(
  req,
  res,
  next,
) {
  if (!process.env.FLY) return next()

  const {method, path: pathname} = req
  if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') {
    return next()
  }

  const {currentInstance, currentIsPrimary, primaryInstance} = getInstanceInfo()
  if (currentIsPrimary) return next()

  if (pathname.includes('__metronome')) {
    // metronome doesn't need to be replayed...
    return next()
  }

  if (pathname.includes('/cache/admin')) {
    // so we can clear the cache in other regions
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
    const {FLY_LITEFS_DIR} = process.env
    invariant(FLY_LITEFS_DIR, 'FLY_LITEFS_DIR is not defined')
    primaryInstance = fs.readFileSync(
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

/**
 * This middleware ensures that the user only continues GET/HEAD requests if they:
 * 1. Do not have a txnum cookie
 * 2. Are running in primary
 * 3. The local txnum is equal or greater than the txnum in the cookie
 *
 * It's also responsible for setting the txnum cookie on post requests
 *
 * This should only be used on FLY
 */
export const txMiddleware: RequestHandler = async (req, res, next) => {
  if (!process.env.FLY) return next()

  const {currentIsPrimary, primaryInstance} = getInstanceInfo()

  const reqCookie = req.get('cookie')
  const cookies = reqCookie ? cookie.parse(reqCookie) : {}

  if (req.method === 'GET' || req.method === 'HEAD') {
    if (cookies.txnum && !currentIsPrimary) {
      const txNumberIsUpToDate = await waitForUpToDateTXNumber(
        Number(cookies.txnum),
      )
      if (txNumberIsUpToDate) {
        res.append(
          'Set-Cookie',
          cookie.serialize('txnum', '', {
            path: '/',
            expires: new Date(0),
          }),
        )
      } else {
        res.set('fly-replay', `instance=${primaryInstance}`)
        return res.sendStatus(409)
      }
    }
  }

  return next()
}

const txEmitter = new EventEmitter()
const {FLY_LITEFS_DIR} = process.env
if (process.env.FLY) {
  invariant(FLY_LITEFS_DIR, 'FLY_LITEFS_DIR is not defined')
  chokidar
    .watch(path.join(FLY_LITEFS_DIR, `sqlite.db-pos`), {
      // disable this if/when fly supports watching this "virtual" file
      usePolling: true,
    })
    .on('change', () => {
      const txNumber = getTXNumber()
      console.log('txNumber changed', {txNumber})
      txEmitter.emit('change', txNumber)
    })
    .on('error', error => {
      console.error(`Error watching sqlite.db-pos`, error)
    })
}

/**
 * @param sessionTXNumber
 * @returns true if it's safe to continue. false if the request should be replayed on the primary
 */
async function waitForUpToDateTXNumber(sessionTXNumber: number) {
  const currentTXNumber = getTXNumber()
  if (currentTXNumber >= sessionTXNumber) return true

  return new Promise(resolve => {
    const MAX_WAITING_TIME = 500
    const timeout = setTimeout(() => {
      console.error(`Timed out waiting for tx number! Call Kent!`)
      txEmitter.off('change', handleTxNumberChange)
      resolve(false)
    }, MAX_WAITING_TIME)

    function handleTxNumberChange(newTXNumber: number) {
      if (newTXNumber >= sessionTXNumber) {
        txEmitter.off('change', handleTxNumberChange)
        clearTimeout(timeout)
        resolve(true)
      }
    }
    txEmitter.on('change', handleTxNumberChange)
  })
}

function getTXNumber() {
  invariant(FLY_LITEFS_DIR, 'FLY_LITEFS_DIR is not defined')
  let dbPos = '0'
  try {
    dbPos = fs.readFileSync(path.join(FLY_LITEFS_DIR, `sqlite.db-pos`), 'utf-8')
  } catch {
    // ignore
  }
  return parseInt(dbPos.trim().split('/')[0] ?? '0', 16)
}

/*
eslint
  no-await-in-loop: "off",
*/
