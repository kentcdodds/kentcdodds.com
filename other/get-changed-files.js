// try to keep this dep-free so we don't have to install deps
const execSync = require('child_process').execSync
const https = require('https')

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        let data = ''
        res.on('data', d => {
          data += d
        })

        res.on('end', () => {
          resolve(JSON.parse(data))
        })
      })
      .on('error', e => {
        reject(e)
      })
  })
}

async function getChangedFiles(currentCommitSha) {
  try {
    const buildInfo = await fetchJson('https://kent.dev/build/info.json')

    const deployedCommitSha = buildInfo.commit.sha
    const changedFiles = execSync(
      `git diff --name-only ${currentCommitSha} ${deployedCommitSha}`,
    )
      .toString()
      .split('\n')
      .filter(Boolean)
    return changedFiles
  } catch (error) {
    console.error(`Something went wrong trying to get changed files.`, error)
    return null
  }
}

module.exports = {getChangedFiles}
