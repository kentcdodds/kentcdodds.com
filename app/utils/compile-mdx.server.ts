import path from 'path'
import fs from 'fs'
import util from 'util'
import {bundleMDX} from 'mdx-bundler'
import visit from 'unist-util-visit'
import remarkPrism from 'remark-prism'
import remarkEmbedder from '@remark-embedder/core'
import oembedTransformer from '@remark-embedder/transformer-oembed'
import type {Config as OEmbedConfig} from '@remark-embedder/transformer-oembed'
import Cache from '@remark-embedder/cache'
import type {Node} from 'unist'

const readFile = util.promisify(fs.readFile)

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

async function compilePost(slug: string) {
  const dir = path.join(__dirname, '../../../content/blog')
  const mdxFilePath = path.join(dir, `${slug}/index.mdx`)
  const fileContents = await readFile(mdxFilePath)
  const {frontmatter, code} = await bundleMDX(String(fileContents), {
    files: {},
    remarkPlugins: [
      remarkPrism,
      function remapImageUrls() {
        return function transformer(tree: Node) {
          visit(tree, 'image', function visitor(node) {
            const url = (node.url as string).replace('./', '')
            node.url = `/__img/content/blog/${slug}/${url}`
          })
        }
      },
      [
        remarkEmbedder,
        {cache, transformers: [[oembedTransformer, getOEmbedConfig]]},
      ],
    ],
  })

  return {
    code,
    frontmatter,
  }
}

export {compilePost}

/*
eslint
  babel/camelcase: "off",
*/
