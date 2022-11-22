const fs = require('fs')
const {spawn} = require('child_process')
const os = require('os')
const path = require('path')
const invariant = require('tiny-invariant')
const stream = require('node:stream')

async function go() {
  const currentInstance = os.hostname()
  const primaryInstance = await getPrimaryInstanceHostname()
  const isPrimary = primaryInstance === currentInstance

  if (isPrimary) {
    console.log(
      `Instance (${currentInstance}) in ${process.env.FLY_REGION} is primary. Deploying migrations.`,
    )
    await deployMigrations()
  } else {
    console.log(
      `Instance (${currentInstance}) in ${process.env.FLY_REGION} is not primary (the primary instance is ${primaryInstance}). Skipping migrations.`,
    )
    console.log('Downloading the cache database from a running instance...')

    const {CACHE_DATABASE_PATH} = process.env
    invariant(CACHE_DATABASE_PATH, 'CACHE_DATABASE_PATH is not defined')
    const cacheDatabaseExists = await fs.promises
      .access(CACHE_DATABASE_PATH)
      .then(() => true)
      .catch(() => false)
    if (!cacheDatabaseExists) {
      console.log(
        'Cache database does not exist. Downloading from a running instance...',
      )
      await fetch(
        `https://${process.env.FLY_APP_NAME}.fly.dev/resources/copy-cache`,
        {
          headers: {
            Authorization: `Bearer ${process.env.INTERNAL_COMMAND_TOKEN}`,
          },
        },
      )
        .then(response => {
          return new Promise((res, rej) => {
            stream.Readable.fromWeb(response.body)
              .pipe(fs.createWriteStream(process.env.CACHE_DATABASE_PATH))
              .on('finish', res)
          })
        })
        .catch(error => {
          console.log('Error fetching cache database:', error)
        })
    }
  }

  console.log('Starting app...')
  await startApp()
}
go()

async function getPrimaryInstanceHostname() {
  try {
    const {FLY_LITEFS_DIR} = process.env
    invariant(FLY_LITEFS_DIR, 'FLY_LITEFS_DIR is not defined')
    const primary = await fs.promises.readFile(
      path.join(FLY_LITEFS_DIR, '.primary'),
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
