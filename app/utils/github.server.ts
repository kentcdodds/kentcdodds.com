import nodePath from 'path'
import type {Octokit} from '@octokit/rest'
import type {GitHubFile} from 'types'
import config from '../../config'

async function downloadMdxFileOrDirectory(
  octokit: Octokit,
  mdxFileOrDirectory: string,
): Promise<Array<GitHubFile>> {
  const parentDir = nodePath.dirname(mdxFileOrDirectory)
  const dirList = await downloadDirList(octokit, parentDir)

  const basename = nodePath.basename(mdxFileOrDirectory)
  const potentials = dirList.filter(({name}) => name.startsWith(basename))

  for (const extension of ['.mdx', '.md']) {
    const file = potentials.find(({name}) => name.endsWith(extension))
    if (file) {
      // eslint-disable-next-line no-await-in-loop
      const {content} = await downloadFile(octokit, file.path, file.sha)
      // /content/about.mdx => entry is about.mdx, but compileMdx needs
      // the entry to be called "/content/index.mdx" so we'll set it to that
      // because this is the entry for this path
      return [{path: nodePath.join(mdxFileOrDirectory, 'index.mdx'), content}]
    }
  }
  const directory = potentials.find(({type}) => type === 'dir')
  if (!directory) return []

  return downloadDirectory(octokit, mdxFileOrDirectory)
}

async function downloadDirectory(
  octokit: Octokit,
  dir: string,
): Promise<Array<GitHubFile>> {
  const dirList = await downloadDirList(octokit, dir)

  const result = await Promise.all(
    dirList.map(async ({path: fileDir, type, sha}) => {
      switch (type) {
        case 'file': {
          return downloadFile(octokit, fileDir, sha)
        }
        case 'dir': {
          return downloadDirectory(octokit, fileDir)
        }
        default: {
          throw new Error(`Unexpected repo file type: ${type}`)
        }
      }
    }),
  )

  return result.flat()
}

async function downloadFile(
  octokit: Octokit,
  path: string,
  sha: string,
): Promise<GitHubFile> {
  const {data} = await octokit.request(
    'GET /repos/{owner}/{repo}/git/blobs/{file_sha}',
    {
      owner: config.contentSrc.owner,
      repo: config.contentSrc.repo,
      file_sha: sha,
    },
  )
  //                                lol
  const encoding = data.encoding as Parameters<typeof Buffer.from>['1']
  return {path, content: Buffer.from(data.content, encoding).toString()}
}

async function downloadDirList(octokit: Octokit, dir: string) {
  const {data} = await octokit.repos.getContent({
    owner: config.contentSrc.owner,
    repo: config.contentSrc.repo,
    path: dir,
  })

  if (!Array.isArray(data)) {
    throw new Error(
      `Tried to download content from ${JSON.stringify(
        config.contentSrc,
      )} at ${dir}. GitHub did not return an array of files. This should never happen...`,
    )
  }

  return data
}

export {downloadMdxFileOrDirectory, downloadDirectory, downloadFile}
