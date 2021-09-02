// try to keep this dep-free so we don't have to install deps
const {getChangedFiles, fetchJson} = require('./get-changed-files')
const [currentCommitSha] = process.argv.slice(2)

async function go() {
  const buildInfo = await fetchJson('https://kent.dev/build/info.json')
  const compareCommitSha = buildInfo.commit.sha
  const changedFiles = await getChangedFiles(currentCommitSha, compareCommitSha)
  console.error('Determining whether the changed files are deployable', {
    changedFiles,
  })
  const isDeployable =
    changedFiles === null ||
    changedFiles.some(({filename}) => !filename.startsWith('content'))
  console.log(isDeployable)
}

go().catch(e => {
  console.error(e)
  console.log('true')
})
