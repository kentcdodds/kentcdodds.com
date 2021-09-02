// try to keep this dep-free so we don't have to install deps
const https = require('https')
const {getChangedFiles, fetchJson} = require('./get-changed-files')

function postRefreshCache(postData) {
  return new Promise((resolve, reject) => {
    try {
      const postDataString = JSON.stringify(postData)
      const options = {
        hostname: 'kent.dev',
        port: 443,
        path: '/_action/refresh-cache?_data=routes/_action/refresh-cache',
        method: 'POST',
        headers: {
          auth: process.env.REFRESH_CACHE_SECRET,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postDataString),
        },
      }

      const req = https
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

const [currentCommitSha] = process.argv.slice(2)

async function go() {
  const shaInfo = await fetchJson('https://kent.dev/refresh-commit-sha')
  let compareSha = shaInfo?.sha
  if (!compareSha) {
    const buildInfo = await fetchJson('https://kent.dev/build/info.json')
    compareSha = buildInfo.commit.sha
  }
  if (typeof compareSha !== 'string') {
    console.log('🤷‍♂️ No sha to compare to. Unsure what to refresh.')
    return
  }

  const changedFiles =
    (await getChangedFiles(currentCommitSha, compareSha)) ?? []
  const contentPaths = changedFiles
    .filter(f => f.filename.startsWith('content'))
    .map(f => f.filename.replace(/^content\//, ''))
  if (contentPaths.length) {
    console.log(`⚡️ Content changed. Requesting the cache be refreshed.`, {
      contentPaths,
    })
    const response = await postRefreshCache({
      contentPaths,
      commitSha: currentCommitSha,
    })
    console.log(`Content change request finished.`, {response})
  } else {
    console.log('🆗 Not refreshing changed content because no content changed.')
  }
}

go().catch(e => console.error(e))
