import nodePath from 'path'
import fs from 'fs/promises'
import sortBy from 'sort-by'
import matter from 'gray-matter'
import type {Octokit} from '@octokit/rest'
import type {Post, PostListing, PostFile, PostIndexFile} from 'types'
import {compilePost} from './compile-mdx.server'

async function getPost(slug: string, octokit: Octokit): Promise<Post> {
  const postFiles =
    process.env.NODE_ENV === 'production'
      ? await getPostFilesFromGH(octokit, slug)
      : await getPostFilesFromFS(slug)
  const {code, frontmatter} = await compilePost(slug, postFiles)
  return {slug, code, frontmatter: frontmatter as Post['frontmatter']}
}

const isDir = async (d: string) => (await fs.lstat(d)).isDirectory()
function typedBoolean<T>(
  value: T,
): value is Exclude<T, false | null | undefined | '' | 0> {
  return Boolean(value)
}

async function getPosts(octokit: Octokit): Promise<Array<PostListing>> {
  const files =
    process.env.NODE_ENV === 'production'
      ? await getPostsFromGH(octokit)
      : await getPostsFromFS()

  const posts = await Promise.all(
    files.map(
      async ({slug, content}): Promise<PostListing> => {
        const matterResult = matter(content)
        const frontmatter = matterResult.data as PostListing['frontmatter']
        return {slug, frontmatter}
      },
    ),
  )

  return posts.sort(sortBy('-frontmatter.published'))
}

async function getPostsFromFS() {
  const dir = nodePath.join(__dirname, '../../../content/blog')
  const dirList = await fs.readdir(dir)
  const fsPosts = await Promise.all(
    dirList.map(
      async (slug): Promise<PostIndexFile | null> => {
        const fullPath = nodePath.join(dir, slug)
        if (slug.startsWith('.') || !(await isDir(fullPath))) return null

        const mdxFilePath = nodePath.join(fullPath, 'index.mdx')
        const content = String(await fs.readFile(mdxFilePath))
        return {path: fullPath, slug, content}
      },
    ),
  )
  return fsPosts.filter(typedBoolean)
}

async function getPostsFromGH(octokit: Octokit) {
  const {data} = await octokit.repos.getContent({
    owner: 'kentcdodds',
    repo: 'remix-kentcdodds',
    path: 'content/blog',
  })
  if (!Array.isArray(data)) throw new Error('Wut github?')

  const result = await Promise.all(
    data
      .filter(({type}) => type === 'dir')
      .map(
        async ({path: fileDir}): Promise<PostIndexFile | null> => {
          const {data: fileData} = await octokit.repos.getContent({
            owner: 'kentcdodds',
            repo: 'remix-kentcdodds',
            path: fileDir,
          })
          if (!Array.isArray(fileData)) throw new Error('Wut github?')
          const file = fileData.find(
            ({type, path}) =>
              (type === 'file' && path.endsWith('mdx')) || path.endsWith('md'),
          )
          if (!file) {
            console.warn(`No index.md(x?) file for ${fileDir}`)
            return null
          }
          const postFile = await downloadFile(octokit, file.path, file.sha)
          return {...postFile, slug: fileDir.replace('content/blog/', '')}
        },
      ),
  )
  return result.filter(typedBoolean)
}

async function getPostFilesFromFS(slug: string) {
  return readDirectory(nodePath.join(__dirname, '../../../content/blog', slug))

  async function readDirectory(dir: string) {
    const dirList = await fs.readdir(dir)

    const result: Array<PostFile | Array<PostFile> | null> = await Promise.all(
      dirList.map(async name => {
        const fullPath = nodePath.join(dir, name)
        if (slug.startsWith('.')) return null

        if (await isDir(fullPath)) {
          return readDirectory(fullPath)
        } else {
          return fs
            .readFile(fullPath)
            .then(value => ({path: fullPath, content: String(value)}))
        }
      }),
    )

    return result.flat().filter(typedBoolean)
  }
}

async function getPostFilesFromGH(octokit: Octokit, slug: string) {
  return downloadDirectory(nodePath.join('content/blog', slug))

  async function downloadDirectory(dir: string): Promise<Array<PostFile>> {
    const {data} = await octokit.repos.getContent({
      owner: 'kentcdodds',
      repo: 'remix-kentcdodds',
      path: dir,
    })
    if (!Array.isArray(data)) throw new Error('Wut github?')

    const result = await Promise.all(
      data.map(async ({path: fileDir, type, sha}) => {
        switch (type) {
          case 'file': {
            return downloadFile(octokit, fileDir, sha)
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
}

async function downloadFile(
  octokit: Octokit,
  path: string,
  sha: string,
): Promise<PostFile> {
  const {data} = await octokit.request(
    'GET /repos/{owner}/{repo}/git/blobs/{file_sha}',
    {
      owner: 'kentcdodds',
      repo: 'remix-kentcdodds',
      file_sha: sha,
    },
  )
  //                                lol
  const encoding = data.encoding as Parameters<typeof Buffer.from>['1']
  return {path, content: Buffer.from(data.content, encoding).toString()}
}

export {getPost, getPosts}

/*
eslint
  babel/camelcase: "off",
*/
