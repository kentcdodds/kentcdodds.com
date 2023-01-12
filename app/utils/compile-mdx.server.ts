import {bundleMDX} from 'mdx-bundler'
import type * as U from 'unified'
import type * as M from 'mdast'
import type * as H from 'hast'
import type * as MDX from 'mdast-util-mdx-jsx'
import {remarkCodeBlocksShiki} from '@kentcdodds/md-temp'
import remarkEmbedder from '@remark-embedder/core'
import type {TransformerInfo} from '@remark-embedder/core'
import oembedTransformer from '@remark-embedder/transformer-oembed'
import calculateReadingTime from 'reading-time'
import type TPQueue from 'p-queue'
import type {GitHubFile} from '~/types'
import * as twitter from './twitter.server'

function handleEmbedderError({url}: {url: string}) {
  return `<p>Error embedding <a href="${url}">${url}</a></p>.`
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

function trimCodeBlocks() {
  return async function transformer(tree: H.Root) {
    const {visit} = await import('unist-util-visit')
    visit(tree, 'element', (preNode: H.Element) => {
      if (preNode.tagName !== 'pre' || !preNode.children.length) {
        return
      }
      const codeNode = preNode.children[0]
      if (
        !codeNode ||
        codeNode.type !== 'element' ||
        codeNode.tagName !== 'code'
      ) {
        return
      }
      const [codeStringNode] = codeNode.children
      if (!codeStringNode) return

      if (codeStringNode.type !== 'text') {
        console.warn(
          `trimCodeBlocks: Unexpected: codeStringNode type is not "text": ${codeStringNode.type}`,
        )
        return
      }
      codeStringNode.value = codeStringNode.value.trim()
    })
  }
}

// yes, I did write this myself 😬
const cloudinaryUrlRegex =
  /^https?:\/\/res\.cloudinary\.com\/(?<cloudName>.+?)\/image\/upload\/((?<transforms>(.+?_.+?)+?)\/)?(\/?(?<version>v\d+)\/)?(?<publicId>.+$)/

function optimizeCloudinaryImages() {
  return async function transformer(tree: H.Root) {
    const {visit} = await import('unist-util-visit')
    visit(
      tree,
      'mdxJsxFlowElement',
      function visitor(node: MDX.MdxJsxFlowElement) {
        if (node.name !== 'img') return
        const srcAttr = node.attributes.find(
          attr => attr.type === 'mdxJsxAttribute' && attr.name === 'src',
        )
        const urlString = srcAttr?.value ? String(srcAttr.value) : null
        if (!srcAttr || !urlString) {
          console.error('image without url?', node)
          return
        }
        const newUrl = handleImageUrl(urlString)
        if (newUrl) {
          srcAttr.value = newUrl
        }
      },
    )

    visit(tree, 'element', function visitor(node: H.Element) {
      if (node.tagName !== 'img') return
      const urlString = node.properties?.src
        ? String(node.properties.src)
        : null
      if (!node.properties?.src || !urlString) {
        console.error('image without url?', node)
        return
      }
      const newUrl = handleImageUrl(urlString)
      if (newUrl) {
        node.properties.src = newUrl
      }
    })
  }

  function handleImageUrl(urlString: string) {
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
      const defaultTransforms = [
        'f_auto',
        'q_auto',
        // gifs can't do dpr transforms
        publicId.endsWith('.gif') ? '' : 'dpr_2.0',
        'w_1600',
      ]
        .filter(Boolean)
        .join(',')
      return [
        `https://res.cloudinary.com/${cloudName}/image/upload`,
        defaultTransforms,
        version,
        publicId,
      ]
        .filter(Boolean)
        .join('/')
    }
  }
}

const twitterTransformer = {
  shouldTransform: twitter.isTwitterUrl,
  getHTML: twitter.getTweetEmbedHTML,
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
  return async function affiliateTransformer(tree: M.Root) {
    const {visit} = await import('unist-util-visit')
    visit(tree, 'link', function visitor(linkNode: M.Link) {
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
  return async function preContainerDivsTransformer(tree: H.Root) {
    const {visit} = await import('unist-util-visit')
    visit(
      tree,
      {type: 'element', tagName: 'pre'},
      function visitor(node, index, parent) {
        if (parent?.type !== 'element') return
        if (parent.tagName !== 'div') return
        if (parent.children.length !== 1 && index === 0) return
        Object.assign(parent, node)
      },
    )
  }
}

const remarkPlugins: U.PluggableList = [
  [
    remarkEmbedder,
    {
      handleError: handleEmbedderError,
      handleHTML: handleEmbedderHtml,
      transformers: [twitterTransformer, eggheadTransformer, oembedTransformer],
    },
  ],
  autoAffiliates,
]

const rehypePlugins: U.PluggableList = [
  optimizeCloudinaryImages,
  trimCodeBlocks,
  remarkCodeBlocksShiki,
  removePreContainerDivs,
]

async function compileMdx<FrontmatterType extends Record<string, unknown>>(
  slug: string,
  githubFiles: Array<GitHubFile>,
) {
  const {default: remarkAutolinkHeadings} = await import(
    'remark-autolink-headings'
  )
  const {default: remarkSlug} = await import('remark-slug')
  const {default: gfm} = await import('remark-gfm')

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

  try {
    const {frontmatter, code} = await bundleMDX({
      source: indexFile.content,
      files,
      mdxOptions(options) {
        options.remarkPlugins = [
          ...(options.remarkPlugins ?? []),
          remarkSlug,
          [remarkAutolinkHeadings, {behavior: 'wrap'}],
          gfm,
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
  } catch (error: unknown) {
    console.error(`Compilation error for slug: `, slug)
    throw error
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
      throw new Error(`${String(keyName)} of item must be a string`)
    }
    const value = item[valueName]
    obj[key] = value
  }
  return obj
}

let _queue: TPQueue | null = null
async function getQueue() {
  const {default: PQueue} = await import('p-queue')
  if (_queue) return _queue

  _queue = new PQueue({
    concurrency: 1,
    throwOnTimeout: true,
    timeout: 1000 * 30,
  })
  return _queue
}

// We have to use a queue because we can't run more than one of these at a time
// or we'll hit an out of memory error because esbuild uses a lot of memory...
async function queuedCompileMdx<
  FrontmatterType extends Record<string, unknown>,
>(...args: Parameters<typeof compileMdx>) {
  const queue = await getQueue()
  const result = await queue.add(() => compileMdx<FrontmatterType>(...args))
  return result
}

export {queuedCompileMdx as compileMdx}
