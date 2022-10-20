import type {RequestHandler} from 'express'
const {FLY, PRIMARY_REGION, FLY_REGION} = process.env
const isPrimaryRegion = PRIMARY_REGION === FLY_REGION

const getReplayResponse: RequestHandler = function getReplayResponse(
  req,
  res,
  next,
) {
  const {method, path: pathname} = req
  if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') {
    return next()
  }

  if (!FLY || isPrimaryRegion) return next()

  if (pathname.includes('__metronome')) {
    // metronome doesn't need to be replayed...
    return next()
  }

  const logInfo = {
    pathname,
    method,
    PRIMARY_REGION,
    FLY_REGION,
  }
  console.info(`Replaying:`, logInfo)
  res.set('fly-replay', `region=${PRIMARY_REGION}`)
  return res.sendStatus(409)
}

export {getReplayResponse}
