import express from 'express'
import 'express-async-errors'
import {createRequestHandler} from '@remix-run/express'

const app = express()

app.use(express.static('public'))

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
