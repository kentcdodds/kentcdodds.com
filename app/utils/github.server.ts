import nodePath from 'path'
import {Octokit as createOctokit} from '@octokit/rest'
import {throttling} from '@octokit/plugin-throttling'
import type {GitHubFile} from '~/types'

const ref = process.env.GITHUB_REF ?? 'main'

const Octokit = createOctokit.plugin(throttling)

type ThrottleOptions = {
  method: string
  url: string
  request: {retryCount: number}
}
const octokit = new Octokit({
  auth: process.env.BOT_GITHUB_TOKEN,
  throttle: {
    onRateLimit: (retryAfter: number, options: ThrottleOptions) => {
      console.warn(
        `Request quota exhausted for request ${options.method} ${options.url}. Retrying after ${retryAfter} seconds.`,
      )

      return true
    },
    onAbuseLimit: (retryAfter: number, options: ThrottleOptions) => {
      // does not retry, only logs a warning
      octokit.log.warn(
        `Abuse detected for request ${options.method} ${options.url}`,
      )
    },
  },
})

async function downloadFirstMdxFile(
  list: Array<{name: string; type: string; path: string; sha: string}>,
) {
  const filesOnly = list.filter(({type}) => type === 'file')
  for (const extension of ['.mdx', '.md']) {
    const file = filesOnly.find(({name}) => name.endsWith(extension))
    if (file) return downloadFileBySha(file.sha)
  }
  return null
}

/**
 *
 * @param relativeMdxFileOrDirectory the path to the content. For example:
 * content/workshops/react-fundamentals.mdx (pass "workshops/react-fudnamentals")
 * content/workshops/react-hooks/index.mdx (pass "workshops/react-hooks")
 * @returns A promise that resolves to an Array of GitHubFiles for the necessary files
 */
async function downloadMdxFileOrDirectory(
  relativeMdxFileOrDirectory: string,
): Promise<{entry: string; files: Array<GitHubFile>}> {
  const mdxFileOrDirectory = `content/${relativeMdxFileOrDirectory}`

  const parentDir = nodePath.dirname(mdxFileOrDirectory)
  const dirList = await downloadDirList(parentDir)

  const basename = nodePath.basename(mdxFileOrDirectory)
  const mdxFileWithoutExt = nodePath.parse(mdxFileOrDirectory).name
  const potentials = dirList.filter(({name}) => name.startsWith(basename))
  const exactMatch = potentials.find(
    ({name}) => nodePath.parse(name).name === mdxFileWithoutExt,
  )
  const dirPotential = potentials.find(({type}) => type === 'dir')

  const content = await downloadFirstMdxFile(
    exactMatch ? [exactMatch] : potentials,
  )
  let files: Array<GitHubFile> = []
  let entry = mdxFileOrDirectory
  if (content) {
    // technically you can get the blog post by adding .mdx at the end... Weird
    // but may as well handle it since that's easy...
    entry = mdxFileOrDirectory.endsWith('.mdx')
      ? mdxFileOrDirectory
      : `${mdxFileOrDirectory}.mdx`
    // /content/about.mdx => entry is about.mdx, but compileMdx needs
    // the entry to be called "/content/index.mdx" so we'll set it to that
    // because this is the entry for this path
    files = [{path: nodePath.join(mdxFileOrDirectory, 'index.mdx'), content}]
  } else if (dirPotential) {
    entry = dirPotential.path
    files = await downloadDirectory(mdxFileOrDirectory)
  }

  return {entry, files}
}

/**
 *
 * @param dir the directory to download.
 * This will recursively download all content at the given path.
 * @returns An array of file paths with their content
 */
async function downloadDirectory(dir: string): Promise<Array<GitHubFile>> {
  const dirList = await downloadDirList(dir)

  const result = await Promise.all(
    dirList.map(async ({path: fileDir, type, sha}) => {
      switch (type) {
        case 'file': {
          const content = await downloadFileBySha(sha)
          return {path: fileDir, content}
        }
        case 'dir': {
          return downloadDirectory(fileDir)
        }
        default: {
          throw new Error(`Unexpected repo file type: ${type}`)
        }
      }
    }),
  )

  return result.flat()
}

/**
 *
 * @param sha the hash for the file (retrieved via `downloadDirList`)
 * @returns a promise that resolves to a string of the contents of the file
 */
async function downloadFileBySha(sha: string) {
  const {data} = await octokit.git.getBlob({
    owner: 'kentcdodds',
    repo: 'kentcdodds.com',
    file_sha: sha,
  })
  //                                lol
  const encoding = data.encoding as Parameters<typeof Buffer.from>['1']
  return Buffer.from(data.content, encoding).toString()
}

// IDEA: possibly change this to a regular fetch since all my content is public anyway:
// https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}
// nice thing is it's not rate limited
async function downloadFile(path: string) {
  const {data} = await octokit.repos.getContent({
    owner: 'kentcdodds',
    repo: 'kentcdodds.com',
    path,
    ref,
  })

  if ('content' in data && 'encoding' in data) {
    const encoding = data.encoding as Parameters<typeof Buffer.from>['1']
    return Buffer.from(data.content, encoding).toString()
  }

  console.error(data)
  throw new Error(
    `Tried to get ${path} but got back something that was unexpected. It doesn't have a content or encoding property`,
  )
}

/**
 *
 * @param path the full path to list
 * @returns a promise that resolves to a file ListItem of the files/directories in the given directory (not recursive)
 */
async function downloadDirList(path: string) {
  const resp = await octokit.repos.getContent({
    owner: 'kentcdodds',
    repo: 'kentcdodds.com',
    path,
    ref,
  })
  const data = resp.data

  if (!Array.isArray(data)) {
    throw new Error(
      `Tried to download content from ${path}. GitHub did not return an array of files. This should never happen...`,
    )
  }

  return data
}

export {downloadMdxFileOrDirectory, downloadDirList, downloadFile}
