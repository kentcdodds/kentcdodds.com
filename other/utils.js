// try to keep this dep-free so we don't have to install deps
function postRefreshCache({
  http = require('https'),
  postData,
  options: {headers: headersOverrides, ...optionsOverrides} = {},
}) {
  return new Promise((resolve, reject) => {
    try {
      const postDataString = JSON.stringify(postData)
      const options = {
        // TODO: update this to kentcdodds.com
        hostname: 'kent.dev',
        port: 443,
        path: '/_action/refresh-cache?_data=routes/_action/refresh-cache',
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
            resolve(JSON.parse(data))
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
