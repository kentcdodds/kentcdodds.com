require('dotenv').config()
const path = require('path')
const express = require('express')
require('express-async-errors')
const {createRequestHandler} = require('@remix-run/express')
const {Octokit} = require('@octokit/rest')

const octokit = new Octokit({
  auth: process.env.BOT_GITHUB_TOKEN,
})

const app = express()

app.use(
  express.static('public', {
    setHeaders: (res, filepath) => {
      // build assets are hashed, so mark files ending with hash as immutable
      if (/.*-[0-9a-f]{8}\..*/.test(filepath)) {
        res.setHeader('Cache-Control', 'max-age=31536000, immutable')
      }
    },
  }),
)

// This is here for start-server-and-run which makes a HEAD
// request to "/" for it to know that the server is ready.
app.head('/', (req, res) => res.sendStatus(200))

app.get('/__img/content/blog/*', (req, res) => {
  if (req.path.includes('..')) {
    // lol, nice try...
    res.sendStatus(404)
    return
  }
  res.sendFile(path.join(__dirname, req.path.replace('/__img', '')))
})

if (process.env.NODE_ENV === 'production') {
  app.all(
    '*',
    createRequestHandler({
      build: require('./build'),
      getLoadContext(req, res) {
        return {req, res, octokit}
      },
    }),
  )
} else {
  const cwd = process.cwd()
  app.all('*', (req, res, next) => {
    for (const key in require.cache) {
      if (
        key.startsWith(path.join(cwd, 'build')) ||
        key.startsWith(path.join(cwd, 'mocks'))
      ) {
        delete require.cache[key]
        if (process.env.DEBUG) console.warn('deleted', key)
      }
    }
    return createRequestHandler({
      build: require('./build'),
      getLoadContext() {
        return {req, res, octokit}
      },
    })(req, res, next)
  })
}

const port = process.env.PORT ?? 3000

app.listen(port, () => {
  console.log(`Express server started on http://localhost:${port}`)
})
