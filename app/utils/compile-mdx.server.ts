import {bundleMDX} from 'mdx-bundler'
import visit from 'unist-util-visit'
import type {PluggableList} from 'unified'
import {remarkCodeBlocksShiki} from '@kentcdodds/md-temp'
import remarkEmbedder from '@remark-embedder/core'
import oembedTransformer from '@remark-embedder/transformer-oembed'
import type {Config as OEmbedConfig} from '@remark-embedder/transformer-oembed'
import gfm from 'remark-gfm'
import type {Node} from 'unist'
import type {GitHubFile, MdxListItem} from 'types'
import calculateReadingTime from 'reading-time'

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
    remarkCodeBlocksShiki,
    function optimizeCloudinaryImages() {
      return function transformer(tree: Node) {
        visit(tree, 'image', function visitor(node: Node & {url?: string}) {
          if (!node.url) {
            console.error('image without url?', node)
            return
          }
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

  // TODO: this is a bit hacky, and needs to be moved / argument controlled
  let content = indexFile.content
  const extracted: Pick<
    MdxListItem['frontmatter'],
    'episode' | 'homework' | 'resources' | 'summary'
  > = {}

  const isPodcast = indexFile.path.startsWith('content/podcast-next')
  if (isPodcast) {
    const lines = content.split('\n')
    if (lines[0]?.startsWith('---')) {
      lines.shift()
    }

    const sections: {[key: string]: string[]} = {
      frontmatter: [],
      description: [],
    }

    let section = 'frontmatter'

    for (const line of lines) {
      if (section === 'frontmatter' && line.startsWith('---')) {
        section = 'description'
        continue
      }

      if (line.startsWith('## ')) {
        section = line.replace('## ', '').trim().toLowerCase()
        sections[section] = []
        continue
      }

      sections[section]!.push(line)
    }

    // TODO: parse markdown / paragraphs in summary ?
    extracted.summary = sections.description?.join('\n').trim()
    extracted.homework = sections.homework?.filter(Boolean) ?? []

    extracted.resources = sections.resources
      ?.map((resource: string) => resource.match(/\[([^[]+)\](\((.*)\))/))
      .filter(Boolean)
      .map(match => ({
        name: match![1] as string,
        url: match![3] as string,
      })) as {name: string; url: string}[]

    content = [
      '---',
      ...(sections.frontmatter as string[]),
      '---',
      ...(sections.transcript ?? []),
    ].join('\n')
  }

  const {frontmatter, code} = await bundleMDX(content, {
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
    summary: readTime,
    frontmatter: {...extracted, ...frontmatter} as FrontmatterType,
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
