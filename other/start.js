const fs = require('fs')
const {spawn} = require('child_process')
const os = require('os')
const path = require('path')
const invariant = require('tiny-invariant')

async function go() {
  const currentInstance = os.hostname()
  const primaryInstance = await getPrimaryInstanceHostname()
  const isPrimary = primaryInstance === currentInstance

  if (isPrimary) {
    console.log(
      `Instance (${currentInstance}) in ${process.env.FLY_REGION} is primary. Deploying migrations.`,
    )
    await exec('npx prisma migrate deploy')
  } else {
    console.log(
      `Instance (${currentInstance}) in ${process.env.FLY_REGION} is not primary (the primary instance is ${primaryInstance}). Skipping migrations.`,
    )
  }

  console.log('Starting app...')
  await exec('npm start')
}
go()

async function getPrimaryInstanceHostname() {
  try {
    const {LITEFS_DIR} = process.env
    invariant(LITEFS_DIR, 'LITEFS_DIR is not defined')
    const primary = await fs.promises.readFile(
      path.join(LITEFS_DIR, '.primary'),
      'utf8',
    )
    console.log(`Found primary instance in .primary file: ${primary}`)
    return primary.trim()
  } catch (error) {
    if (error?.code === 'ENOENT') {
      console.log(`No .primary file found.`)
    } else {
      console.log(`Error getting primary from .primary file:`, error)
    }
    const currentInstance = os.hostname()
    console.log(
      `Using current instance (${currentInstance}) as primary (in ${process.env.FLY_REGION})`,
    )
    return currentInstance
  }
}

async function exec(command, options) {
  const child = spawn(command, {shell: true, stdio: 'inherit', ...options})
  await new Promise((res, rej) => {
    child.on('exit', code => {
      if (code === 0) {
        res()
      } else {
        rej()
      }
    })
  })
}
