import * as nodePath from 'path'
import * as fs from 'fs/promises'
import {rest} from 'msw'
import {setupServer} from 'msw/node'
import * as config from '../config'

const isDirectory = async (d: string) => {
  try {
    return (await fs.lstat(d)).isDirectory()
  } catch {
    return false
  }
}

type GHContentsDescription = {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string | null
  type: 'dir' | 'file'
  _links: {
    self: string
    git: string
    html: string
  }
}

type GHContent = {
  sha: string
  node_id: string
  size: number
  url: string
  content: string
  encoding: 'base64'
}

const hitNetwork = process.env.NODE_ENV !== 'test' && !process.env.MOCK_NETWORK

const handlers = [
  rest.get(
    `https://api.github.com/repos/:owner/:repo/contents/:path`,
    async (req, res, ctx) => {
      const {owner, repo} = req.params
      const path = decodeURIComponent(req.params.path).trim()
      const isMockable =
        config.contentSrc.owner === owner &&
        config.contentSrc.repo === repo &&
        path.startsWith(config.contentSrc.path)

      if (!isMockable) return

      const localDir = nodePath.join(__dirname, '..', path)
      const isLocalDir = await isDirectory(localDir)

      const shouldMakeRealRequest = !isLocalDir && hitNetwork
      if (shouldMakeRealRequest) return

      if (!isLocalDir) {
        return res(
          ctx.status(404),
          ctx.json({
            message: 'Not Found',
            documentation_url:
              'https://docs.github.com/rest/reference/repos#get-repository-content',
          }),
        )
      }

      const dirList = await fs.readdir(localDir)

      const contentDescriptions = await Promise.all(
        dirList.map(
          async (name): Promise<GHContentsDescription> => {
            const relativePath = nodePath.join(path, name)
            // NOTE: this is a cheat-code so we don't have to determine the sha of the file
            // and our sha endpoint handler doesn't have to do a reverse-lookup.
            const sha = relativePath
            const fullPath = nodePath.join(localDir, name)
            const isDir = await isDirectory(fullPath)
            const size = isDir ? 0 : (await fs.stat(fullPath)).size
            return {
              name,
              path: relativePath,
              sha,
              size,
              url: `https://api.github.com/repos/${owner}/${repo}/contents/${path}?${req.url.searchParams}`,
              html_url: `https://github.com/${owner}/${repo}/tree/main/${path}`,
              git_url: `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}`,
              download_url: null,
              type: isDir ? 'dir' : 'file',
              _links: {
                self: `https://api.github.com/repos/${owner}/${repo}/contents/${path}${req.url.searchParams}`,
                git: `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}`,
                html: `https://github.com/${owner}/${repo}/tree/main/${path}`,
              },
            }
          },
        ),
      )

      return res(ctx.json(contentDescriptions))
    },
  ),
  rest.get(
    `https://api.github.com/repos/:owner/:repo/git/blobs/:sha`,
    async (req, res, ctx) => {
      const {owner, repo} = req.params
      const sha = decodeURIComponent(req.params.sha).trim()
      // if the sha includes a "/" that means it's not a sha but a relativePath
      // and therefore the client is getting content it got from the local
      // mock environment, not the actual github API.
      if (!sha.includes('/')) return

      // NOTE: we cheat a bit and in the contents/:path handler, we set the sha to the relativePath
      const relativePath = sha

      if (!relativePath) {
        throw new Error(`Unable to find the file for the sha ${sha}`)
      }

      const fullPath = nodePath.join(__dirname, '..', relativePath)
      const encoding = 'base64' as const
      const size = (await fs.stat(fullPath)).size
      const content = await fs.readFile(fullPath, {encoding: 'utf-8'})

      const resource: GHContent = {
        sha,
        node_id: `${sha}_node_id`,
        size,
        url: `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`,
        content: Buffer.from(content, 'utf-8').toString(encoding),
        encoding,
      }

      return res(ctx.json(resource))
    },
  ),
  rest.get('https://oembed.com/providers.json', async (req, res, ctx) => {
    if (hitNetwork) return

    return res(
      ctx.json([
        {
          provider_name: 'Twitter',
          provider_url: 'http://www.twitter.com/',
          endpoints: [
            {
              schemes: [
                'https://twitter.com/*/status/*',
                'https://*.twitter.com/*/status/*',
                'https://twitter.com/*/moments/*',
                'https://*.twitter.com/*/moments/*',
              ],
              url: 'https://publish.twitter.com/oembed',
            },
          ],
        },
      ]),
    )
  }),
  rest.get('https://publish.twitter.com/oembed', async (req, res, ctx) => {
    if (hitNetwork) return

    return res(
      ctx.json({
        html:
          '<blockquote class="twitter-tweet" data-dnt="true" data-theme="dark"><p lang="en" dir="ltr">I spent a few minutes working on this, just for you all. I promise, it wont disappoint. Though it may surprise 🎉<br><br>🙏 <a href="https://t.co/wgTJYYHOzD">https://t.co/wgTJYYHOzD</a></p>— Kent C. Dodds (@kentcdodds) <a href="https://twitter.com/kentcdodds/status/783161196945944580?ref_src=twsrc%5Etfw">October 4, 2016</a></blockquote>',
      }),
    )
  }),
  rest.get('https://www.youtube.com/oembed', async (req, res, ctx) => {
    if (hitNetwork) return

    return res(
      ctx.json({
        title: "🚨 Announcement! I'm Going Full-Time Educator 👨‍🏫",
        author_name: 'Kent C. Dodds',
        author_url: 'https://www.youtube.com/user/kentdoddsfamily',
        type: 'video',
        height: 113,
        width: 200,
        version: '1.0',
        provider_name: 'YouTube',
        provider_url: 'https://www.youtube.com/',
        thumbnail_height: 360,
        thumbnail_width: 480,
        thumbnail_url: 'https://i.ytimg.com/vi/ticz3T7xSWI/hqdefault.jpg',
        html:
          '<iframe width="200" height="113" src="https://www.youtube.com/embed/ticz3T7xSWI?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
      }),
    )
  }),

  rest.post(
    'https://api.mailgun.net/v3/:domain/messages',
    async (req, res, ctx) => {
      if (hitNetwork) return

      const randomId = '20210321210543.1.E01B8B612C44B41B'
      const id = `<${randomId}>@${req.params.domain}`
      return res(ctx.json({id, message: 'Queued. Thank you.'}))
    },
  ),
]
const server = setupServer(...handlers)

server.listen({onUnhandledRequest: 'error'})
console.log('🔶 Mock server installed')

process.once('SIGINT', () => server.close())
process.once('SIGTERM', () => server.close())

/*
eslint
  consistent-return: "off",
*/
