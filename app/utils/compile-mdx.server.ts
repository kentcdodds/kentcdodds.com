import {bundleMDX} from 'mdx-bundler'
import visit from 'unist-util-visit'
import remarkPrism from 'remark-prism'
import remarkEmbedder from '@remark-embedder/core'
import oembedTransformer from '@remark-embedder/transformer-oembed'
import type {Config as OEmbedConfig} from '@remark-embedder/transformer-oembed'
import Cache from '@remark-embedder/cache'
import type {Node} from 'unist'
import type {PostFile} from 'types'

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

async function compilePost(slug: string, postFiles: Array<PostFile>) {
  const indexRegex = new RegExp(`${slug}\\/index.mdx?$`)
  const indexFile = postFiles.find(({path}) => indexRegex.test(path))
  if (!indexFile) throw new Error(`${slug} has no index.md(x) file.`)

  const rootDir = indexFile.path.replace(/index.mdx?$/, '')
  const relativeFiles: Array<PostFile> = postFiles.map(({path, content}) => ({
    path: path.replace(rootDir, './'),
    content,
  }))
  const files = arrayToObj(relativeFiles, {
    keyName: 'path',
    valueName: 'content',
  })
  console.log(files)
  const {frontmatter, code} = await bundleMDX(indexFile.content, {
    files,
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

function arrayToObj<ItemType extends Record<string, unknown>>(
  array: Array<ItemType>,
  {keyName, valueName}: {keyName: keyof ItemType; valueName: keyof ItemType},
) {
  const obj: Record<string, ItemType[keyof ItemType]> = {}
  for (const item of array) {
    const key = item[keyName]
    if (typeof key !== 'string') {
      throw new Error(`${keyName} of item must be a string`)
    }
    const value = item[valueName]
    obj[key] = value
  }
  return obj
}

export {compilePost}

/*
eslint
  babel/camelcase: "off",
*/
