import type {RequestHandler} from 'express'
const {
  FLY,
  IS_PRIMARY_FLY_INSTANCE,
  PRIMARY_INSTANCE,
  FLY_INSTANCE,
  FLY_REGION,
} = process.env

const getReplayResponse: RequestHandler = function getReplayResponse(
  req,
  res,
  next,
) {
  const {method, path: pathname} = req
  if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') {
    return next()
  }

  if (!FLY || IS_PRIMARY_FLY_INSTANCE) return next()

  if (pathname.includes('__metronome')) {
    // metronome doesn't need to be replayed...
    return next()
  }

  const logInfo = {
    pathname,
    method,
    PRIMARY_INSTANCE,
    FLY_INSTANCE,
    FLY_REGION,
  }
  console.info(`Replaying:`, logInfo)
  res.set('fly-replay', `instance=${IS_PRIMARY_FLY_INSTANCE}`)
  return res.sendStatus(409)
}

export {getReplayResponse}
