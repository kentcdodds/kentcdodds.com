import nodePath from 'path'
import {Octokit as createOctokit} from '@octokit/rest'
import {throttling} from '@octokit/plugin-throttling'
import type {Await, GitHubFile} from 'types'
import config from '../../config'
import * as redis from './redis.server'
import {getErrorMessage} from './misc'

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
 * @param bustCache deletes any value in the cache for this item before retrieving the value
 * @returns A promise that resolves to an Array of GitHubFiles for the necessary files
 */
async function downloadMdxFileOrDirectory(
  relativeMdxFileOrDirectory: string,
  bustCache: boolean = false,
): Promise<Array<GitHubFile>> {
  const mdxFileOrDirectory = `${config.contentSrc.path}/${relativeMdxFileOrDirectory}`
  const key = `mdx-file-or-dir:${mdxFileOrDirectory}`
  if (bustCache) {
    await redis.del(key)
  } else {
    try {
      const cached = await redis.get(key)
      if (cached) return JSON.parse(cached)
    } catch (error: unknown) {
      console.error(getErrorMessage(error))
    }
  }

  const parentDir = nodePath.dirname(mdxFileOrDirectory)
  const dirList = await downloadDirList(parentDir, bustCache)

  const basename = nodePath.basename(mdxFileOrDirectory)
  const mdxFileWithoutExt = nodePath.parse(mdxFileOrDirectory).name
  const potentials = dirList.filter(({name}) => name.startsWith(basename))
  const exactMatch = potentials.find(
    ({name}) => nodePath.parse(name).name === mdxFileWithoutExt,
  )

  const content = await downloadFirstMdxFile(
    exactMatch ? [exactMatch] : potentials,
  )
  let downloaded: Array<GitHubFile>
  // /content/about.mdx => entry is about.mdx, but compileMdx needs
  // the entry to be called "/content/index.mdx" so we'll set it to that
  // because this is the entry for this path
  if (content) {
    downloaded = [
      {path: nodePath.join(mdxFileOrDirectory, 'index.mdx'), content},
    ]
  } else if (potentials.find(({type}) => type === 'dir')) {
    downloaded = await downloadDirectory(mdxFileOrDirectory, bustCache)
  } else {
    downloaded = []
  }

  await redis.set(key, JSON.stringify(downloaded))
  return downloaded
}

/**
 *
 * @param dir the directory to download.
 * This will recursively download all content at the given path.
 * @returns An array of file paths with their content
 */
async function downloadDirectory(
  dir: string,
  bustCache: boolean,
): Promise<Array<GitHubFile>> {
  const dirList = await downloadDirList(dir, bustCache)

  const result = await Promise.all(
    dirList.map(async ({path: fileDir, type, sha}) => {
      switch (type) {
        case 'file': {
          const content = await downloadFileBySha(sha)
          return {path: fileDir, content}
        }
        case 'dir': {
          return downloadDirectory(fileDir, bustCache)
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
  return Buffer.from(data.content, encoding).toString()
}

/**
 *
 * @param path the full path to list
 * @returns a promise that resolves to a file ListItem of the files/directories in the given directory (not recursive)
 */
async function downloadDirList(path: string, bustCache: boolean) {
  const key = `dir-list:${path}`
  type DirList = Await<ReturnType<typeof octokit.repos.getContent>>['data']
  let data: DirList | null = null
  let isCached = false
  if (bustCache) {
    await redis.del(key)
  } else {
    try {
      const cached = await redis.get(key)
      if (cached) {
        data = JSON.parse(cached)
        isCached = true
      }
    } catch (error: unknown) {
      console.error(getErrorMessage(error))
    }
  }

  if (!data) {
    const resp = await octokit.repos.getContent({
      owner: config.contentSrc.owner,
      repo: config.contentSrc.repo,
      path,
    })
    data = resp.data
  }

  if (!Array.isArray(data)) {
    throw new Error(
      `Tried to download content from ${path}. GitHub did not return an array of files. This should never happen...`,
    )
  }

  if (!isCached) {
    await redis.set(key, JSON.stringify(data))
  }

  return data
}

export {downloadMdxFileOrDirectory, downloadDirList}
