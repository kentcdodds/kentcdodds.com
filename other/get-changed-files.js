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

const changeTypes = {
  M: 'modified',
  A: 'added',
  D: 'deleted',
  R: 'moved',
}

async function getChangedFiles(currentCommitSha, compareCommitSha) {
  try {
    const lineParser = /^(?<change>\w).+?\s+(?<filename>.+$)/
    const changedFiles = execSync(
      `git diff --name-status ${currentCommitSha} ${compareCommitSha}`,
    )
      .toString()
      .split('\n')
      .map(line => line.match(lineParser)?.groups)
      .filter(Boolean)
    const changes = []
    for (const {change, filename} of changedFiles) {
      const changeType = changeTypes[change]
      if (changeType) {
        changes.push({changeType: changeTypes[change], filename})
      } else {
        console.error(`Unknown change type: ${change} ${filename}`)
      }
    }
    return changes
  } catch (error) {
    console.error(`Something went wrong trying to get changed files.`, error)
    return null
  }
}

module.exports = {getChangedFiles, fetchJson}
