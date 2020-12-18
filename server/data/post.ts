import path from 'path'
import fs from 'fs/promises'
import sortBy from 'sort-by'
import matter from 'gray-matter'
import type {Post, PostListing} from 'types'
import {compilePost} from './compile-mdx'

async function getPost(name: string): Promise<Post> {
  const {js, frontmatter} = await compilePost(name)
  return {name, js, frontmatter}
}

const isDir = async (d: string) => (await fs.lstat(d)).isDirectory()
function typedBoolean<T>(
  value: T,
): value is Exclude<T, false | null | undefined | '' | 0> {
  return Boolean(value)
}

async function getPosts(): Promise<Array<PostListing>> {
  const dir = path.join(__dirname, '../../content/blog')
  const dirList = await fs.readdir(dir)
  const promises = dirList.map(async name => {
    const fullPath = path.join(dir, name)
    if (name.startsWith('.') || !(await isDir(fullPath))) return null

    const mdxFilePath = path.join(fullPath, 'index.mdx')
    const mdxContents = await fs.readFile(mdxFilePath)
    const matterResult = matter(mdxContents)
    const frontmatter = matterResult.data as PostListing['frontmatter']
    return {name, frontmatter}
  })
  const posts = (await Promise.all(promises)).filter(typedBoolean)

  return posts.sort(sortBy('-frontmatter.published'))
}

export {getPost, getPosts}

/*
eslint
  babel/camelcase: "off",
*/
