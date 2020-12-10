import path from 'path'
import express from 'express'
import 'express-async-errors'
import {createRequestHandler} from '@remix-run/express'
import config from './blog.config.json'
import {getPosts} from './data/post'

const app = express()

app.use(express.static('public'))

// This is here for start-server-and-run which makes a HEAD
// request to "/" for it to know that the server is ready.
app.head('/', (req, res) => res.sendStatus(200))

app.get('/__img/content/blog/*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', req.path.replace('/__img', '')))
})

app.get('/feed.xml', async (req, res) => {
  const posts = await getPosts()

  const entries = posts
    .map(post => {
      const href = `${config.url}/${post.name}`
      return `
        <entry>
          <title>${post.frontmatter.title}</title>
          <link href="${href}"/>
          <id>${href}</id>
          <updated>${post.frontmatter.published}</updated>
          <summary>${post.frontmatter.description}</summary>
        </entry>
    `
    })
    .join('\n')

  const text = `<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>${config.name}</title>
      <link href="${config.url}"/>
      <id>${config.url}</id>
      ${entries}
    </feed>
  `

  res.set('content-type', 'application/xml')
  res.send(text)
})

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
