const fetch = require('node-fetch')
const execSync = require('child_process').execSync

const [currentCommitSha] = process.argv.slice(2)
async function go() {
  let isDeployable = true
  try {
    const json = await (await fetch('https://kent.dev/build/info.json')).json()

    const deployedCommitSha = json.commit.sha
    const changedFiles = execSync(
      `git diff --name-only ${currentCommitSha} ${deployedCommitSha}`,
    )
      .toString()
      .split('\n')
      .filter(Boolean)
    isDeployable = changedFiles.some(file => !file.startsWith('content'))
  } catch (error) {
    console.error(
      `Something went wrong trying to determine whether this is deployable.`,
      error,
    )
  }

  console.log(isDeployable)
}

void go()
