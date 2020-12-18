import path from 'path'
import fs from 'fs-extra'
import sortBy from 'sort-by'
import visit from 'unist-util-visit'
import remarkPrism from 'remark-prism'
import cacheManager from 'cache-manager'
import type {Cache as CMCache} from 'cache-manager'
import fsStore from 'cache-manager-fs'
import remarkEmbedder from '@remark-embedder/core'
import oembedTransformer from '@remark-embedder/transformer-oembed'
import type {Config as OEmbedConfig} from '@remark-embedder/transformer-oembed'
import matter from 'gray-matter'
import {rollup} from 'rollup'
import {babel as rollupBabel} from '@rollup/plugin-babel'
import {terser} from 'rollup-plugin-terser'
import type {Node} from 'unist'
import {createCompiler} from '@mdx-js/mdx'
import type {Post, PostListing} from 'types'

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

////////////////////////////////////////////////////////////////////////////////
const getOEmbedConfig: OEmbedConfig = ({provider}) => {
  if (provider.provider_name === 'Twitter') {
    return {
      params: {
        dnt: true,
        theme: 'dark',
        omit_script: true,
      },
    }
  }
  return null
}

const TTL = Number.MAX_SAFE_INTEGER

class Cache {
  public cache?: CMCache

  constructor() {
    const directory = path.join(
      process.cwd(),
      'node_modules/.cache/@remark-embedder',
    )
    fs.ensureDirSync(directory)
    this.cache = cacheManager.caching({
      store: fsStore,
      ttl: TTL,
      options: {
        ttl: TTL,
        path: directory,
      },
    })
  }

  get(key: string): Promise<string | undefined> {
    return new Promise(resolve => {
      if (!this.cache) throw new Error('Cache not initialized')
      this.cache.get(key, (err: Error | undefined, res: string) => {
        resolve(err ? undefined : res)
      })
    })
  }

  set(key: string, value: string): Promise<string | undefined> {
    return new Promise(resolve => {
      if (!this.cache) throw new Error('Cache not initialized')

      this.cache.set(key, value, {ttl: TTL}, (err: Error | undefined) => {
        resolve(err ? undefined : value)
      })
    })
  }
}

const cache = new Cache()

async function compilePost(name: string) {
  const dir = path.join(__dirname, '../../content/blog')
  const mdxFilePath = path.join(dir, `${name}/index.mdx`)
  const fileContents = await fs.readFile(mdxFilePath)
  const {data, content: mdx} = matter(fileContents)
  const frontmatter = data as Post['frontmatter']

  const mdxCompiler = createCompiler({
    remarkPlugins: [
      remarkPrism,
      function remapImageUrls() {
        return function transformer(tree: Node) {
          visit(tree, 'image', function visitor(node) {
            const url = (node.url as string).replace('./', '')
            node.url = `/__img/content/blog/${name}/${url}`
          })
        }
      },
      [
        remarkEmbedder,
        {cache, transformers: [[oembedTransformer, getOEmbedConfig]]},
      ],
    ],
  })

  const {contents: entryCode} = await mdxCompiler.process(mdx)

  const entryPath = path.join(dir, name, './index.mdx.js')
  const code = await bundleCode(entryCode, entryPath)

  return {
    js: `${code};return Component;`,
    frontmatter,
  }
}

async function bundleCode(code: string, entry: string) {
  const inMemoryModulePlugin = {
    name: 'in-memory-module',
    resolveId(importee: string | undefined, importer: string | undefined) {
      if (!importer) return importee
      if (entry === importee) return entry
      return false
    },
    load(id: string) {
      if (id === entry) return code
      throw new Error(`${id} cannot be loaded. Does not match ${entry}`)
    },
  }

  const inputOptions = {
    external: ['react', 'react-dom'],
    input: entry,
    plugins: [
      inMemoryModulePlugin,
      rollupBabel({
        babelHelpers: 'inline',
        configFile: false,
        exclude: /node_modules/,
        extensions: ['.js', '.ts', '.tsx', '.md', '.mdx'],
        presets: [
          ['@babel/preset-react', {pragma: 'mdx'}],
          ['@babel/preset-env', {targets: {node: '12'}}],
          ['@babel/preset-typescript', {allExtensions: true, isTSX: true}],
        ],
      }),
      terser(),
    ],
  }

  const outputOptions = {
    name: 'Component',
    format: 'iife',
    globals: {
      react: 'React',
      'react-dom': 'ReactDOM',
    },
  } as const

  const bundle = await rollup(inputOptions)
  const result = await bundle.generate(outputOptions)
  return result.output[0].code
}

export {getPost, getPosts}

/*
eslint
  babel/camelcase: "off",
*/
