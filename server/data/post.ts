import fs from 'fs/promises'
import path from 'path'
import sortBy from 'sort-by'
import visit from 'unist-util-visit'
import remarkPrism from 'remark-prism'
import {rollup} from 'rollup'
import {babel as rollupBabel} from '@rollup/plugin-babel'
import {terser} from 'rollup-plugin-terser'
import type {Node} from 'unist'
import type {VFile} from 'vfile'
// @ts-expect-error no types and can't declare for some reason?
import {createCompiler} from '@mdx-js/mdx'
import setFrontmatter from 'remark-frontmatter'
import remove from 'unist-util-remove'
import yaml from 'yaml'
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

    const compiledMdx = await compileMdx(name)
    const frontmatter = compiledMdx.data.frontmatter
    return {name, frontmatter}
  })
  const posts = (await Promise.all(promises)).filter(typedBoolean)

  return posts.sort(sortBy('-frontmatter.published'))
}

////////////////////////////////////////////////////////////////////////////////
async function compilePost(name: string) {
  const dir = path.join(__dirname, '../../content/blog')
  const compiledMdx = await compileMdx(name)
  const entryCode = compiledMdx.contents
  const frontmatter = compiledMdx.data.frontmatter
  const entryPath = path.join(dir, name, './index.mdx.js')
  const code = await bundleCode(entryCode, entryPath)

  return {
    js: `
${code}
Component.frontmatter = ${JSON.stringify(frontmatter ?? {})}
return Component;
  `.trim(),
    frontmatter,
  }
}

async function compileMdx(name: string) {
  const dir = path.join(__dirname, '../../content/blog')
  const mdxContents = await fs.readFile(path.join(dir, `${name}/index.mdx`))

  const mdxCompiler = createCompiler({
    remarkPlugins: [
      [setFrontmatter, ['yaml']],
      function extractFrontmatter() {
        return function transformer(tree: Node, file: VFile) {
          visit(tree, 'yaml', function visitor(node) {
            const data = file.data as Record<string, unknown>
            data.frontmatter = yaml.parse(node.value as string)
          })
          remove(tree, 'yaml')
        }
      },
      remarkPrism,
      function remapImageUrls() {
        return function transformer(tree: Node) {
          visit(tree, 'image', function visitor(node) {
            const url = (node.url as string).replace('./', '')
            node.url = `/__img/content/blog/${name}/${url}`
          })
        }
      },
    ],
  })

  return mdxCompiler.process(mdxContents)
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
          '@babel/preset-react',
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
