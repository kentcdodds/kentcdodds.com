import path from 'path'
import fs from 'fs/promises'
import sortBy from 'sort-by'
import matter from 'gray-matter'
import type {Post, PostListing} from 'types'
import {compilePost} from './compile-mdx.server'

async function getPost(slug: string): Promise<Post> {
  const {code, frontmatter} = await compilePost(slug)
  return {slug, code, frontmatter: frontmatter as Post['frontmatter']}
}

const isDir = async (d: string) => (await fs.lstat(d)).isDirectory()
function typedBoolean<T>(
  value: T,
): value is Exclude<T, false | null | undefined | '' | 0> {
  return Boolean(value)
}

async function getPosts(): Promise<Array<PostListing>> {
  const dir = path.join(__dirname, '../../../content/blog')
  const dirList = await fs.readdir(dir)
  const promises = dirList.map(async slug => {
    const fullPath = path.join(dir, slug)
    if (slug.startsWith('.') || !(await isDir(fullPath))) return null

    const mdxFilePath = path.join(fullPath, 'index.mdx')
    const mdxContents = await fs.readFile(mdxFilePath)
    const matterResult = matter(mdxContents)
    const frontmatter = matterResult.data as PostListing['frontmatter']
    return {slug, frontmatter}
  })
  const posts = (await Promise.all(promises)).filter(typedBoolean)

  return posts.sort(sortBy('-frontmatter.published'))
}

export {getPost, getPosts}

/*
eslint
  babel/camelcase: "off",
*/
