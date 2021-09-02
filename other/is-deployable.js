// try to keep this dep-free so we don't have to install deps
const {getChangedFiles} = require('./get-changed-files')

const [currentCommitSha] = process.argv.slice(2)

getChangedFiles(currentCommitSha).then(changedFiles => {
  const isDeployable = changedFiles.some(file => !file.startsWith('content'))
  console.log(isDeployable)
})
