import * as React from 'react'
import {buildImageUrl} from 'cloudinary-build-url'
import type {LoaderData as RootLoaderData} from '../root'
import type {GitHubFile, MdxListItem, MdxPage} from '~/types'
import * as mdxBundler from 'mdx-bundler/client'
import {compileMdx} from '~/utils/compile-mdx.server'
import {
  downloadDirList,
  downloadMdxFileOrDirectory,
} from '~/utils/github.server'
import {AnchorOrLink, getDisplayUrl, getUrl, typedBoolean} from '~/utils/misc'
import {redisCache} from './redis.server'
import type {Timings} from './metrics.server'
import {cachified} from './cache.server'
import {getSocialMetas} from './seo'
import {
  getImageBuilder,
  getImgProps,
  getSocialImageWithPreTitle,
} from '~/images'
import {Themed} from './theme-provider'

type CachifiedOptions = {
  forceFresh?: boolean
  request?: Request
  timings?: Timings
  maxAge?: number
  expires?: Date
}

const defaultMaxAge = 1000 * 60 * 60 * 24 * 7

const getCompiledKey = (contentDir: string, slug: string) =>
  `${contentDir}:${slug}:compiled`
const checkCompiledValue = (value: unknown) =>
  typeof value === 'object' &&
  (value === null || ('code' in value && 'frontmatter' in value))

async function getMdxPage(
  {
    contentDir,
    slug,
  }: {
    contentDir: string
    slug: string
  },
  options: CachifiedOptions,
): Promise<MdxPage | null> {
  const key = getCompiledKey(contentDir, slug)
  const page = await cachified({
    cache: redisCache,
    maxAge: defaultMaxAge,
    ...options,
    // reusing the same key as compiledMdxCached because we just return that
    // exact same value. Cachifying this allows us to skip getting the cached files
    key,
    checkValue: checkCompiledValue,
    getFreshValue: async () => {
      const pageFiles = await downloadMdxFilesCached(contentDir, slug, options)
      const compiledPage = await compileMdxCached({
        contentDir,
        slug,
        ...pageFiles,
        options,
      })
      return compiledPage
    },
  })
  if (!page) {
    // if there's no page, let's remove it from the cache
    void redisCache.del(key)
  }
  return page
}

async function getMdxPagesInDirectory(
  contentDir: string,
  options: CachifiedOptions,
) {
  const dirList = await getMdxDirList(contentDir, options)

  // our octokit throttle plugin will make sure we don't hit the rate limit
  const pageDatas = await Promise.all(
    dirList.map(async ({slug}) => {
      return {
        ...(await downloadMdxFilesCached(contentDir, slug, options)),
        slug,
      }
    }),
  )

  const pages = await Promise.all(
    pageDatas.map(pageData =>
      compileMdxCached({contentDir, ...pageData, options}),
    ),
  )
  return pages.filter(typedBoolean)
}

const getDirListKey = (contentDir: string) => `${contentDir}:dir-list`

async function getMdxDirList(contentDir: string, options?: CachifiedOptions) {
  return cachified({
    cache: redisCache,
    maxAge: defaultMaxAge,
    ...options,
    key: getDirListKey(contentDir),
    checkValue: (value: unknown) => Array.isArray(value),
    getFreshValue: async () => {
      const fullContentDirPath = `content/${contentDir}`
      const dirList = (await downloadDirList(fullContentDirPath))
        .map(({name, path}) => ({
          name,
          slug: path
            .replace(`${fullContentDirPath}/`, '')
            .replace(/\.mdx$/, ''),
        }))
        .filter(({name}) => name !== 'README.md')
      return dirList
    },
  })
}

const getDownloadKey = (contentDir: string, slug: string) =>
  `${contentDir}:${slug}:downloaded`

async function downloadMdxFilesCached(
  contentDir: string,
  slug: string,
  options: CachifiedOptions,
) {
  const key = getDownloadKey(contentDir, slug)
  const downloaded = await cachified({
    cache: redisCache,
    maxAge: defaultMaxAge,
    ...options,
    key,
    checkValue: (value: unknown) => {
      if (typeof value !== 'object') {
        return `value is not an object`
      }
      if (value === null) {
        return `value is null`
      }

      const download = value as Record<string, unknown>
      if (!Array.isArray(download.files)) {
        return `value.files is not an array`
      }
      if (typeof download.entry !== 'string') {
        return `value.entry is not a string`
      }

      return true
    },
    getFreshValue: async () =>
      downloadMdxFileOrDirectory(`${contentDir}/${slug}`),
  })
  // if there aren't any files, remove it from the cache
  if (!downloaded.files.length) {
    void redisCache.del(key)
  }
  return downloaded
}

async function compileMdxCached({
  contentDir,
  slug,
  entry,
  files,
  options,
}: {
  contentDir: string
  slug: string
  entry: string
  files: Array<GitHubFile>
  options: CachifiedOptions
}) {
  const key = getCompiledKey(contentDir, slug)
  const page = await cachified({
    cache: redisCache,
    maxAge: defaultMaxAge,
    ...options,
    key,
    checkValue: checkCompiledValue,
    getFreshValue: async () => {
      const compiledPage = await compileMdx<MdxPage['frontmatter']>(slug, files)
      if (compiledPage) {
        if (
          compiledPage.frontmatter.bannerCloudinaryId &&
          !compiledPage.frontmatter.bannerBlurDataUrl
        ) {
          try {
            compiledPage.frontmatter.bannerBlurDataUrl = await getBlurDataUrl(
              compiledPage.frontmatter.bannerCloudinaryId,
            )
          } catch (error: unknown) {
            console.error(
              'oh no, there was an error getting the blur image data url',
              error,
            )
          }
        }
        return {
          ...compiledPage,
          slug,
          editLink: `https://github.com/kentcdodds/kentcdodds.com/edit/main/${entry}`,
        }
      } else {
        return null
      }
    },
  })
  // if there's no page, remove it from the cache
  if (!page) {
    void redisCache.del(key)
  }
  return page
}

async function getBlurDataUrl(cloudinaryId: string) {
  const imageURL = buildImageUrl(cloudinaryId, {
    transformations: {
      resize: {width: 100},
      quality: 'auto',
      format: 'webp',
      effect: {
        name: 'blur',
        value: '1000',
      },
    },
  })
  const dataUrl = await getDataUrlForImage(imageURL)
  return dataUrl
}

async function getDataUrlForImage(imageUrl: string) {
  const res = await fetch(imageUrl)
  const arrayBuffer = await res.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mime = res.headers.get('Content-Type') ?? 'image/webp'
  const dataUrl = `data:${mime};base64,${base64}`
  return dataUrl
}

async function getBlogMdxListItems(options: CachifiedOptions) {
  return cachified({
    cache: redisCache,
    maxAge: defaultMaxAge,
    ...options,
    key: 'blog:mdx-list-items',
    getFreshValue: async () => {
      let pages = await getMdxPagesInDirectory('blog', options)

      pages = pages.sort((a, z) => {
        const aTime = new Date(a.frontmatter.date ?? '').getTime()
        const zTime = new Date(z.frontmatter.date ?? '').getTime()
        return aTime > zTime ? -1 : aTime === zTime ? 0 : 1
      })

      return pages.map(mapFromMdxPageToMdxListItem)
    },
  })
}

function mdxPageMeta({
  data,
  parentsData,
}: {
  data: {page: MdxPage | null} | null
  parentsData: {root: RootLoaderData}
}) {
  const {requestInfo} = parentsData.root
  if (data?.page) {
    const {keywords = [], ...extraMeta} = data.page.frontmatter.meta ?? {}
    return {
      ...getSocialMetas({
        title: data.page.frontmatter.title,
        description: data.page.frontmatter.description,
        keywords: keywords.join(', '),
        url: getUrl(requestInfo),
        image: getSocialImageWithPreTitle({
          url: getDisplayUrl(requestInfo),
          featuredImage:
            data.page.frontmatter.bannerCloudinaryId ??
            'kentcdodds.com/illustrations/kody-flying_blue',
          title:
            data.page.frontmatter.socialImageTitle ??
            data.page.frontmatter.title ??
            'Untitled',
          preTitle:
            data.page.frontmatter.socialImagePreTitle ??
            `Checkout this article`,
        }),
      }),
      ...extraMeta,
    }
  } else {
    return {
      title: 'Not found',
      description:
        'You landed on a page that Kody the Coding Koala could not find 🐨😢',
    }
  }
}

/**
 * This is useful for when you don't want to send all the code for a page to the client.
 */
function mapFromMdxPageToMdxListItem(page: MdxPage): MdxListItem {
  const {code, ...mdxListItem} = page
  return mdxListItem
}

const mdxComponents = {
  a: AnchorOrLink,
  Themed,
  ThemedBlogImage,
  BlogImage,
}
/**
 * This should be rendered within a useMemo
 * @param code the code to get the component from
 * @returns the component
 */
function getMdxComponent(code: string) {
  const Component = mdxBundler.getMDXComponent(code)
  function KCDMdxComponent({
    components,
    ...rest
  }: Parameters<typeof Component>['0']) {
    return (
      // @ts-expect-error the types are wrong here
      <Component components={{...mdxComponents, ...components}} {...rest} />
    )
  }
  return KCDMdxComponent
}

function BlogImage({
  cloudinaryId,
  imgProps,
}: {
  cloudinaryId: string
  imgProps: JSX.IntrinsicElements['img']
}) {
  return (
    <img
      className="py-8 w-full rounded-lg object-cover"
      {...getImgProps(getImageBuilder(cloudinaryId, imgProps.alt), {
        widths: [350, 550, 700, 845, 1250, 1700, 2550],
        sizes: [
          '(max-width:1023px) 80vw',
          '(min-width:1024px) and (max-width:1620px) 50vw',
          '850px',
        ],
        transformations: {background: 'rgb:e6e9ee'},
      })}
      {...imgProps}
    />
  )
}

function ThemedBlogImage({
  darkCloudinaryId,
  lightCloudinaryId,
  imgProps,
}: {
  darkCloudinaryId: string
  lightCloudinaryId: string
  imgProps: JSX.IntrinsicElements['img']
}) {
  return (
    <Themed
      light={<BlogImage cloudinaryId={lightCloudinaryId} imgProps={imgProps} />}
      dark={<BlogImage cloudinaryId={darkCloudinaryId} imgProps={imgProps} />}
    />
  )
}

function useMdxComponent(code: string) {
  return React.useMemo(() => getMdxComponent(code), [code])
}

export {
  getMdxPage,
  getMdxDirList,
  getMdxPagesInDirectory,
  mapFromMdxPageToMdxListItem,
  getBlogMdxListItems,
  mdxPageMeta,
  useMdxComponent,
}
