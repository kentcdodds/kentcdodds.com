import {bundleMDX} from 'mdx-bundler'
import visit from 'unist-util-visit'
import type {PluggableList} from 'unified'
import {remarkCodeBlocksShiki} from '@kentcdodds/md-temp'
import remarkEmbedder from '@remark-embedder/core'
import type {TransformerInfo} from '@remark-embedder/core'
import type {Image, Link} from 'mdast'
import type {Element} from 'hast'
import oembedTransformer from '@remark-embedder/transformer-oembed'
import type {Config as OEmbedConfig} from '@remark-embedder/transformer-oembed'
import gfm from 'remark-gfm'
import type {Node} from 'unist'
import type {GitHubFile} from 'types'
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
  return `<p>Error embedding <a href="${url}">${url}</a>.`
}

type GottenHTML = string | null
function handleEmbedderHtml(html: GottenHTML, info: TransformerInfo) {
  if (!html) return null

  const url = new URL(info.url)
  // matches youtu.be and youtube.com
  if (/youtu\.?be/.test(url.hostname)) {
    // this allows us to set youtube embeds to 100% width and the
    // height will be relative to that width with a good aspect ratio
    return makeEmbed(html, 'youtube')
  }
  if (url.hostname.includes('codesandbox.io')) {
    return makeEmbed(html, 'codesandbox', '80%')
  }
  return html
}

function makeEmbed(html: string, type: string, heightRatio = '56.25%') {
  return `
  <div class="embed" data-embed-type="${type}">
    <div style="padding-bottom: ${heightRatio}">
      ${html}
    </div>
  </div>
`
}

// yes, I did write this myself 😬
const cloudinaryUrlRegex =
  /^https?:\/\/res\.cloudinary\.com\/(?<cloudName>.+?)\/image\/upload(\/(?<transforms>(?!v\d+).+?))?(\/(?<version>v\d+))?\/(?<publicId>.+$)/

function optimizeCloudinaryImages() {
  return function transformer(tree: Node) {
    visit(tree, 'image', function visitor(node: Image) {
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
}

const eggheadTransformer = {
  shouldTransform: (url: string) => {
    const {host, pathname} = new URL(url)

    return (
      host === 'egghead.io' &&
      pathname.includes('/lessons/') &&
      !pathname.includes('/embed')
    )
  },
  getHTML: (url: string) => {
    const {host, pathname, searchParams} = new URL(url)

    // Don't preload videos
    if (!searchParams.has('preload')) {
      searchParams.set('preload', 'false')
    }

    // Kent's affiliate link
    if (!searchParams.has('af')) {
      searchParams.set('af', '5236ad')
    }

    const iframeSrc = `https://${host}${pathname}/embed?${searchParams.toString()}`

    return makeEmbed(
      `<iframe src="${iframeSrc}" allowfullscreen></iframe>`,
      'egghead',
    )
  },
}

function autoAffiliates() {
  return function affiliateTransformer(tree: Node) {
    visit(tree, 'link', function visitor(linkNode: Link) {
      if (linkNode.url.includes('amazon.com')) {
        const amazonUrl = new URL(linkNode.url)
        if (!amazonUrl.searchParams.has('tag')) {
          amazonUrl.searchParams.set('tag', 'kentcdodds-20')
          linkNode.url = amazonUrl.toString()
        }
      }
      if (linkNode.url.includes('egghead.io')) {
        const eggheadUrl = new URL(linkNode.url)
        if (!eggheadUrl.searchParams.has('af')) {
          eggheadUrl.searchParams.set('af', '5236ad')
          linkNode.url = eggheadUrl.toString()
        }
      }
    })
  }
}

function removePreContainerDivs() {
  return function preContainerDivsTransformer(tree: Node) {
    visit(
      tree,
      'element',
      function visitor(node: Element, index: number, parent: Node | undefined) {
        if (node.tagName !== 'pre') return
        if (parent?.type !== 'element') return
        const parentEl = parent as Element
        if (parentEl.tagName !== 'div') return
        if (parentEl.children.length !== 1 && index === 0) return
        Object.assign(parentEl, node)
      },
    )
  }
}

const remarkPlugins: PluggableList = [
  gfm,
  remarkCodeBlocksShiki,
  optimizeCloudinaryImages,
  [
    remarkEmbedder,
    {
      handleError: handleEmbedderError,
      handleHTML: handleEmbedderHtml,
      transformers: [[oembedTransformer, getOEmbedConfig], eggheadTransformer],
    },
  ],
  autoAffiliates,
]

const rehypePlugins: PluggableList = [removePreContainerDivs]

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

  const {frontmatter, code} = await bundleMDX(indexFile.content, {
    files,
    xdmOptions(options) {
      options.remarkPlugins = [
        ...(options.remarkPlugins ?? []),
        ...remarkPlugins,
      ]
      options.rehypePlugins = [
        ...(options.rehypePlugins ?? []),
        ...rehypePlugins,
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
