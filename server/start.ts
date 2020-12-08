import express from 'express'
import 'express-async-errors'
import {createRequestHandler} from '@remix-run/express'

const app = express()

app.use(express.static('public'))

// This is here for start-server-and-run which makes a HEAD
// request to "/" for it to know that the server is ready.
app.head('/', (req, res) => res.sendStatus(200))

app.get(
  '*',
  createRequestHandler({
    enableSessions: false,
    getLoadContext() {
      return {}
    },
  }),
)

const port = process.env.PORT ?? 3000

app.listen(port, () => {
  console.log(`Express server started on http://localhost:${port}`)
})
