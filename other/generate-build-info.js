import path from 'path'
import fs from 'fs'
import {fileURLToPath} from 'url'

const commit = process.env.COMMIT_SHA

async function getCommit() {
  if (!commit) return `No COMMIT_SHA environment variable set.`
  try {
    const res = await fetch(
      `https://api.github.com/repos/kentcdodds/kentcdodds.com/commits/${commit}`,
    )
    const data = await res.json()
    return {
      isDeployCommit: commit === 'HEAD' ? 'Unknown' : true,
      sha: data.sha,
      author: data.commit.author.name,
      date: data.commit.author.date,
      message: data.commit.message,
      link: data.html_url,
    }
  } catch (error) {
    return `Unable to get git commit info: ${error.message}`
  }
}

const buildInfo = {
  buildTime: Date.now(),
  commit: await getCommit(),
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
fs.writeFileSync(
  path.join(__dirname, '../public/build/info.json'),
  JSON.stringify(buildInfo, null, 2),
)
console.log('build info generated', buildInfo)
