import fs from 'fs/promises'
import path from 'path'
import sortBy from 'sort-by'
import parseFrontMatter from 'front-matter'
import remark from 'remark'
import html from 'remark-html'
import visit from 'unist-util-visit'
import remarkPrism from 'remark-prism'
import type {Post} from 'types'
import config from '../../blog.config.json'

async function getPost(name: string): Promise<Post> {
  const contents =
    process.env.NODE_ENV === 'production'
      ? await getPostFromGitHub(name)
      : await getPostFromFS(name)

  const {body, attributes} = parseFrontMatter<Post['attributes']>(contents)
  const result = await remark()
    .use(remarkPrism)
    .use(html)
    .use(() => markdownAst => {
      visit(markdownAst, 'image', node => {
        const url = (node.url as string).replace('./', '')
        node.url = `/__img/content/blog/${name}/${url}`
      })
    })
    .process(body)

  return {
    name,
    html: result.contents.toString(),
    attributes,
  }
}

async function getPosts(): Promise<Array<Post>> {
  const files =
    process.env.NODE_ENV === 'production'
      ? await getPostsFromGitHub()
      : await getPostsFromFS()

  return files
    .map(({name, contents}) => {
      const {attributes} = parseFrontMatter<Post['attributes']>(contents)
      return {name: name.replace(/\.md$/, ''), attributes}
    })
    .sort(sortBy('-attributes.published'))
}

////////////////////////////////////////////////////////////////////////////////
const isDir = async (d: string) => (await fs.lstat(d)).isDirectory()

function typedBoolean<T>(
  value: T,
): value is Exclude<T, false | null | undefined | '' | 0> {
  return Boolean(value)
}

async function getPostsFromFS() {
  const dir = path.join(__dirname, '../../content/blog')
  const dirList = await fs.readdir(dir)
  const promises = dirList.map(async name => {
    const fullPath = path.join(dir, name)
    if (name.startsWith('.') || !(await isDir(fullPath))) return null

    const contents = await fs.readFile(path.join(fullPath, 'index.md'))
    return {name, contents: contents.toString()}
  })
  const posts = (await Promise.all(promises)).filter(typedBoolean)
  return posts
}

// TODO: make this work
async function getPostsFromGitHub() {
  const url = `https://api.github.com/repos/${config.repo}/contents/content/blog?ref=${config.branch}`
  const res = await fetch(url, {
    headers: {
      authorization: `token ${process.env.GH_TOKEN}`,
    },
  })
  const files: Array<{name: string; download_url: string}> = await res.json()
  return Promise.all(
    files.map(async ({name, download_url}) => {
      const contentsRes = await fetch(download_url)
      const contents = await contentsRes.text()
      return {name, contents}
    }),
  )
}

async function getPostFromFS(param: string) {
  const dir = path.join(__dirname, '../../content/blog')
  const file = await fs.readFile(path.join(dir, `${param}/index.md`))
  return file.toString()
}

async function getPostFromGitHub(name: string) {
  const url = `https://raw.githubusercontent.com/${config.repo}/${config.branch}/app/posts/${name}.md`
  const res = await fetch(url)
  return res.text()
}

export {getPost, getPosts}

/*
eslint
  babel/camelcase: "off",
*/
