import path from 'path'
import fs from 'fs/promises'
import visit from 'unist-util-visit'
import remarkPrism from 'remark-prism'
import remarkEmbedder from '@remark-embedder/core'
import oembedTransformer from '@remark-embedder/transformer-oembed'
import type {Config as OEmbedConfig} from '@remark-embedder/transformer-oembed'
import Cache from '@remark-embedder/cache'
import matter from 'gray-matter'
import {rollup} from 'rollup'
import {babel as rollupBabel} from '@rollup/plugin-babel'
import {terser} from 'rollup-plugin-terser'
import type {Node} from 'unist'
import {createCompiler} from '@mdx-js/mdx'

import type {Post} from 'types'

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

const cache = new Cache()

async function compilePost(name: string) {
  const dir = path.join(__dirname, '../../../content/blog')
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

export {compilePost}

/*
eslint
  babel/camelcase: "off",
*/
