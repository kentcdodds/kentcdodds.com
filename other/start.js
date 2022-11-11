const fs = require('fs')
const {spawn} = require('child_process')
const os = require('os')

async function go() {
  process.env.FLY_INSTANCE = os.hostname()
  try {
    const primary = await fs.promises.readFile('/litefs/data/.primary', 'utf8')
    process.env.PRIMARY_INSTANCE = primary.trim()
    console.log(`Found primary instance in .primary file: ${primary}`)
  } catch (error) {
    process.env.IS_PRIMARY_FLY_INSTANCE = 'true' // <-- error reading file? We're the primary
    if (error?.code === 'ENOENT') {
      console.log(`No .primary file found.`)
    } else {
      console.log(`Error getting primary from .primary file:`, error)
    }
    console.log(
      `Using current instance (${process.env.FLY_INSTANCE}) as primary (in ${process.env.FLY_REGION})`,
    )
  }

  if (process.env.IS_PRIMARY_FLY_INSTANCE) {
    console.log(
      `Instance (${process.env.FLY_INSTANCE}) in ${process.env.FLY_REGION} is primary. Deploying migrations.`,
    )
    await deployMigrations()
  } else {
    console.log(
      `Instance (${process.env.FLY_INSTANCE}) in ${process.env.FLY_REGION} is not primary (the primary instance is ${process.env.PRIMARY_INSTANCE}). Skipping migrations.`,
    )
  }

  console.log('Starting app...')
  await startApp()
}
go()

async function deployMigrations() {
  const command = 'npx prisma migrate deploy'
  const child = spawn(command, {shell: true, stdio: 'inherit'})
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

async function startApp() {
  const command = 'npm start'
  const child = spawn(command, {shell: true, stdio: 'inherit'})
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
