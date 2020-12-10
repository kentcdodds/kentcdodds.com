import fs from 'fs/promises'
import path from 'path'
import sortBy from 'sort-by'
import parseFrontMatter from 'front-matter'
import remark from 'remark'
import html from 'remark-html'
import gatsbyPrism from 'gatsby-remark-prismjs'
import type {Post} from 'types'
import config from '../../blog.config.json'

async function getPost(name: string): Promise<Post> {
  const contents =
    process.env.NODE_ENV === 'production'
      ? await getPostFromGitHub(name)
      : await getPostFromFS(name)

  const {body, attributes} = parseFrontMatter<Post['attributes']>(contents)
  const result = await remark()
    .use(() => markdownAST => {
      gatsbyPrism({markdownAST}, {showLineNumbers: true})
      return markdownAST
    })
    .use(html)
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
async function getPostsFromFS() {
  const dir = path.join(__dirname, '..', '..', 'app', 'posts')
  const files = (await fs.readdir(dir)).filter(file => !file.startsWith('.'))
  return Promise.all(
    files.map(async name => {
      const contents = await fs.readFile(path.join(dir, name))
      return {name, contents: contents.toString()}
    }),
  )
}

async function getPostsFromGitHub() {
  const url = `https://api.github.com/repos/${config.repo}/contents/app/posts?ref=${config.branch}`
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
  const dir = path.join(__dirname, '..', '..', 'app', 'posts')
  const file = await fs.readFile(path.join(dir, `${param}.md`))
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
