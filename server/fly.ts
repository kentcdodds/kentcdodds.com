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

  if (pathname.includes('__insights')) {
    // metronome doesn't need to be replayed...
    return next()
  }

  if (pathname.startsWith('/calls')) {
    // replaying calls doesn't work very well because the request body is so
    // large so we won't replay those
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
