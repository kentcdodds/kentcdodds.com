import {bundleMDX} from 'mdx-bundler'
import visit from 'unist-util-visit'
import type {
  PluggableList,
  PluginTuple,
  Settings as UnifiedSettings,
} from 'unified'
import {getProcessor as getRyansProcessor} from '@ryanflorence/md'
import remarkEmbedder from '@remark-embedder/core'
import oembedTransformer from '@remark-embedder/transformer-oembed'
import type {Config as OEmbedConfig} from '@remark-embedder/transformer-oembed'
import gfm from 'remark-gfm'
import type {Node} from 'unist'
import type {GitHubFile} from 'types'
import calculateReadingTime from 'reading-time'

// here's a hack because I didn't want to vendor Ryan's code...
const ryansHighlighter = (
  getRyansProcessor().attachers as Array<
    PluginTuple<unknown[], UnifiedSettings>
  >
).find(([pluginFn]) => {
  return /shiki/i.test(pluginFn.name)
})

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

function handleEmbedderError({url}: {url: string}) {
  return `<p>Error embedding <a href="${url}">the URL</a>.`
}

// yes, I did write this myself 😬
const cloudinaryUrlRegex =
  /^https?:\/\/res\.cloudinary\.com\/(?<cloudName>.+?)\/image\/upload(\/(?<transforms>(?!v\d+).+?))?(\/(?<version>v\d+))?\/(?<publicId>.+$)/

async function compileMdx<FrontmatterType extends Record<string, unknown>>(
  slug: string,
  githubFiles: Array<GitHubFile>,
) {
  if (!ryansHighlighter) {
    throw new Error(`Couldn't find Ryan's Highlighter`)
  }

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
    ryansHighlighter,
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
      {
        handleError: handleEmbedderError,
        transformers: [[oembedTransformer, getOEmbedConfig]],
      },
    ],
  ]

  const {frontmatter, code} = await bundleMDX(indexFile.content, {
    files,
    xdmOptions(options) {
      options.remarkPlugins = [
        ...(options.remarkPlugins ?? []),
        ...remarkPlugins,
      ]
      return options
    },
  })

  const readTime = calculateReadingTime(indexFile.content)

  return {
    code,
    readTime,
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
