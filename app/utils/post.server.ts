import sortBy from 'sort-by'
import matter from 'gray-matter'
import type {Octokit} from '@octokit/rest'
import type {Post, PostListing, PostIndexFile} from 'types'
import config from '../../config'
import {downloadDirectory, downloadFile} from './github.server'
import {compileMdx} from './compile-mdx.server'

async function getPost(slug: string, octokit: Octokit): Promise<Post> {
  const postFiles = await downloadDirectory(
    octokit,
    `${config.contentSrc.path}/blog/${slug}`,
  )

  const {code, frontmatter} = await compileMdx(slug, postFiles)
  return {slug, code, frontmatter: frontmatter as Post['frontmatter']}
}

function typedBoolean<T>(
  value: T,
): value is Exclude<T, '' | 0 | false | null | undefined> {
  return Boolean(value)
}

async function getPosts(octokit: Octokit): Promise<Array<PostListing>> {
  const {data} = await octokit.repos.getContent({
    owner: config.contentSrc.owner,
    repo: config.contentSrc.repo,
    path: `${config.contentSrc.path}/blog`,
  })
  if (!Array.isArray(data)) throw new Error('Wut github?')

  const result = await Promise.all(
    data
      .filter(({type}) => type === 'dir')
      .map(
        async ({path: fileDir}): Promise<PostIndexFile | null> => {
          const {data: fileData} = await octokit.repos.getContent({
            owner: config.contentSrc.owner,
            repo: config.contentSrc.repo,
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
  const files = result.filter(typedBoolean)

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

export {getPost, getPosts}

/*
eslint
  babel/camelcase: "off",
*/
