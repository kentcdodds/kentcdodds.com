import * as nodePath from 'path'
import * as fs from 'fs/promises'
import type {DefaultRequestBody, MockedRequest, RestHandler} from 'msw'
import {rest} from 'msw'
import * as config from '../config'
import {hitNetwork} from './utils'

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

const githubHandlers: Array<RestHandler<MockedRequest<DefaultRequestBody>>> = [
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
]

export {githubHandlers}
