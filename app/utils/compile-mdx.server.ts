import {bundleMDX} from 'mdx-bundler'
import visit from 'unist-util-visit'
import type {PluggableList} from 'unified'
import remarkPrism from 'remark-prism'
import remarkEmbedder from '@remark-embedder/core'
import oembedTransformer from '@remark-embedder/transformer-oembed'
import type {Config as OEmbedConfig} from '@remark-embedder/transformer-oembed'
import Cache from '@remark-embedder/cache'
import gfm from 'remark-gfm'
import type {Node} from 'unist'
import type {GitHubFile} from 'types'

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

// yes, I did write this myself 😬
const cloudinaryUrlRegex = /^https?:\/\/res\.cloudinary\.com\/(?<cloudName>.+?)\/image\/upload(\/(?<transforms>(?!v\d+).+?))?(\/(?<version>v\d+))?\/(?<publicId>.+$)/

async function compileMdx<FrontmatterType extends Record<string, unknown>>(
  slug: string,
  githubFiles: Array<GitHubFile>,
) {
  const indexRegex = new RegExp(`${slug}\\/index.mdx?$`)
  const indexFile = githubFiles.find(({path}) => indexRegex.test(path))
  if (!indexFile) return null

  const rootDir = indexFile.path.replace(/index.mdx?$/, '')
  const relativeFiles: Array<GitHubFile> = githubFiles.map(
    ({path, content}) => ({
      path: path.replace(rootDir, './'),
      content,
    }),
  )
  const files = arrayToObj(relativeFiles, {
    keyName: 'path',
    valueName: 'content',
  })

  const remarkPlugins: PluggableList = [
    gfm,
    remarkPrism,
    function optimizeCloudinaryImages() {
      return function transformer(tree: Node) {
        visit(tree, 'image', function visitor(node) {
          const urlString = String(node.url)
          const match = urlString.match(cloudinaryUrlRegex)
          const groups = match?.groups
          if (groups) {
            const {cloudName, transforms, version, publicId} = groups as {
              cloudName: string
              transforms?: string
              version?: string
              publicId: string
            }
            // don't add transforms if they're already included
            if (transforms) return
            const defaultTransforms = 'f_auto,q_auto,dpr_2.0'
            node.url = [
              `https://res.cloudinary.com/${cloudName}/image/upload`,
              defaultTransforms,
              version,
              publicId,
            ]
              .filter(Boolean)
              .join('/')
          }
        })
      }
    },
    [
      remarkEmbedder,
      {cache, transformers: [[oembedTransformer, getOEmbedConfig]]},
    ],
  ]

  const {frontmatter, code} = await bundleMDX(indexFile.content, {
    files,
    xdmOptions(input, options) {
      options.remarkPlugins = [
        ...(options.remarkPlugins ?? []),
        ...remarkPlugins,
      ]
      return options
    },
  })

  return {
    code,
    frontmatter: frontmatter as FrontmatterType,
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

export {compileMdx}

/*
eslint
  babel/camelcase: "off",
*/
