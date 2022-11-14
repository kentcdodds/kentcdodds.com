import os from 'os'
import fs from 'fs'
import type {RequestHandler} from 'express'
import path from 'path'
import cookie from 'cookie'
import invariant from 'tiny-invariant'

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
 * 1. Do not have a txid cookie
 * 2. Are running in primary
 * 3. The local txid is equal or greater than the txid in the cookie
 *
 * It's also responsible for setting the txid cookie on post requests
 *
 * This only applies on FLY
 */
export const txIDMiddleware: RequestHandler = async (req, res, next) => {
  const {currentIsPrimary, primaryInstance} = getInstanceInfo()

  if (!process.env.FLY) return next()

  const reqCookie = req.get('cookie')
  const cookies = reqCookie ? cookie.parse(reqCookie) : {}

  if (req.method === 'GET' || req.method === 'HEAD') {
    console.log({cookies})
    if (cookies.txid && !currentIsPrimary) {
      const shouldReplay = await waitForUpToDateTXID(parseInt(cookies.txid, 16))
      if (shouldReplay) {
        console.log('Timed out waiting, replaying request to primary instance')
        res.set('fly-replay', `instance=${primaryInstance}`)
        return res.sendStatus(409)
      } else {
        console.log(
          'Request is up to date, clearing the cookie and, continuing',
        )
        res.append(
          'Set-Cookie',
          cookie.serialize('txid', '', {
            path: '/',
            expires: new Date(0),
          }),
        )
      }
    }
  } else if (req.method === 'POST') {
    if (currentIsPrimary) {
      const txid = await getTXID()
      if (!txid) return next()

      res.append(
        'Set-Cookie',
        cookie.serialize('txid', txid, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: true,
        }),
      )
    }
  }

  return next()
}

const sleep = (t: number) => new Promise(r => setTimeout(r, t))

/**
 * @param sessionTXNumber
 * @returns true if it's safe to continue. false if the request should be replayed on the primary
 */
async function waitForUpToDateTXID(sessionTXNumber: number) {
  let attempt = 1
  const maxAttempts = 5
  while (attempt <= maxAttempts) {
    const txid = await getTXID()
    console.log({attempt, sessionTXNumber, txid})
    if (!txid) {
      console.log('returning true due to no txid')
      return true
    }
    const localTXNumber = parseInt(txid, 16)
    if (sessionTXNumber < localTXNumber) {
      // slowly decrease the amount of time we wait
      const sleepTime = (Math.abs(attempt - maxAttempts) + 1) * 50
      console.log(`sleeping ${sleepTime}ms before next attempt`)
      await sleep(sleepTime)
      attempt++
    } else {
      console.log('returning true due to txid being up to date')
      return true
    }
  }
  console.log('Waited long enough, returning false')
  return false
}

async function getTXID() {
  const {FLY_LITEFS_DIR} = process.env
  invariant(FLY_LITEFS_DIR, 'FLY_LITEFS_DIR is not defined')
  const dbPos = await fs.promises
    .readFile(path.join(FLY_LITEFS_DIR, `sqlite.db-pos`), 'utf-8')
    .catch(() => '0')
  return dbPos.trim().split('/')[0]
}

/*
eslint
  no-await-in-loop: "off",
*/
