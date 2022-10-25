const hostname =
  process.env.GITHUB_REF_NAME === 'dev'
    ? 'kcd-staging.fly.dev'
    : 'kentcdodds.com'

// try to keep this dep-free so we don't have to install deps
function postRefreshCache({
  http = require('https'),
  postData,
  options: {headers: headersOverrides, ...optionsOverrides} = {},
}) {
  return new Promise((resolve, reject) => {
    try {
      const postDataString = JSON.stringify(postData)
      const searchParams = new URLSearchParams()
      const options = {
        hostname,
        port: 443,
        path: `/action/refresh-cache`,
        method: 'POST',
        headers: {
          auth: process.env.REFRESH_CACHE_SECRET,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postDataString),
          ...headersOverrides,
        },
        ...optionsOverrides,
      }

      const req = http
        .request(options, res => {
          let data = ''
          res.on('data', d => {
            data += d
          })

          res.on('end', () => {
            try {
              resolve(JSON.parse(data))
            } catch (error) {
              reject(data)
            }
          })
        })
        .on('error', reject)
      req.write(postDataString)
      req.end()
    } catch (error) {
      console.log('oh no', error)
      reject(error)
    }
  })
}

module.exports = {postRefreshCache}
