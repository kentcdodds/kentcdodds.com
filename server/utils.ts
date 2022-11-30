export const primaryHost = 'kentcdodds.com'
export const allowedHosts = [primaryHost, 'kcd.fly.dev', 'kcd-staging.fly.dev']
export const getHost = (req: {get: (key: string) => string | undefined}) =>
  req.get('X-Forwarded-Host') ?? req.get('host') ?? ''
