import * as React from 'react'
import {buildImageUrl} from 'cloudinary-build-url'
import type {LoaderData as RootLoaderData} from '../root'
import type {GitHubFile, MdxListItem, MdxPage} from '~/types'
import * as mdxBundler from 'mdx-bundler/client'
import LRU from 'lru-cache'
import {compileMdx} from '~/utils/compile-mdx.server'
import {
  downloadDirList,
  downloadMdxFileOrDirectory,
} from '~/utils/github.server'
import {
  AnchorOrLink,
  formatDate,
  getDisplayUrl,
  getUrl,
  typedBoolean,
} from '~/utils/misc'
import {cache, cachified} from './cache.server'
import {getSocialMetas} from './seo'
import {
  getImageBuilder,
  getImgProps,
  getSocialImageWithPreTitle,
} from '~/images'
import {Themed} from './theme-provider'
import {markdownToHtmlUnwrapped, stripHtml} from './markdown.server'
import {ConvertKitForm} from '~/convertkit/form'
import {CloudinaryVideo} from '~/components/cloudinary-video'
import type {Timings} from './timing.server'
import {useOptionalUser} from './use-root-data'

type CachifiedOptions = {
  forceFresh?: boolean | string
  request?: Request
  ttl?: number
  timings?: Timings
}

const defaultTTL = 1000 * 60 * 60 * 24 * 14
const defaultStaleWhileRevalidate = 1000 * 60 * 60 * 24 * 30

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
  const {forceFresh, ttl = defaultTTL, request, timings} = options
  const key = `mdx-page:${contentDir}:${slug}:compiled`
  const page = await cachified({
    key,
    cache,
    request,
    timings,
    ttl,
    staleWhileRevalidate: defaultStaleWhileRevalidate,
    forceFresh,
    checkValue: checkCompiledValue,
    getFreshValue: async () => {
      const pageFiles = await downloadMdxFilesCached(contentDir, slug, options)
      const compiledPage = await compileMdxCached({
        contentDir,
        slug,
        ...pageFiles,
        options,
      }).catch(err => {
        console.error(`Failed to get a fresh value for mdx:`, {
          contentDir,
          slug,
        })
        return Promise.reject(err)
      })
      return compiledPage
    },
  })
  if (!page) {
    // if there's no page, let's remove it from the cache
    void cache.delete(key)
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
  const {forceFresh, ttl = defaultTTL, request, timings} = options ?? {}
  const key = getDirListKey(contentDir)
  return cachified({
    cache,
    request,
    timings,
    ttl,
    staleWhileRevalidate: defaultStaleWhileRevalidate,
    forceFresh,
    key,
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

export async function downloadMdxFilesCached(
  contentDir: string,
  slug: string,
  options: CachifiedOptions,
) {
  const {forceFresh, ttl = defaultTTL, request, timings} = options
  const key = `${contentDir}:${slug}:downloaded`
  const downloaded = await cachified({
    cache,
    request,
    timings,
    ttl,
    staleWhileRevalidate: defaultStaleWhileRevalidate,
    forceFresh,
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
    void cache.delete(key)
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
  const key = `${contentDir}:${slug}:compiled`
  const page = await cachified({
    cache,
    ttl: defaultTTL,
    staleWhileRevalidate: defaultStaleWhileRevalidate,
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
        if (compiledPage.frontmatter.bannerCredit) {
          const credit = await markdownToHtmlUnwrapped(
            compiledPage.frontmatter.bannerCredit,
          )
          compiledPage.frontmatter.bannerCredit = credit
          const noHtml = await stripHtml(credit)
          if (!compiledPage.frontmatter.bannerAlt) {
            compiledPage.frontmatter.bannerAlt = noHtml
              .replace(/(photo|image)/i, '')
              .trim()
          }
          if (!compiledPage.frontmatter.bannerTitle) {
            compiledPage.frontmatter.bannerTitle = noHtml
          }
        }
        return {
          dateDisplay: compiledPage.frontmatter.date
            ? formatDate(compiledPage.frontmatter.date)
            : undefined,
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
    void cache.delete(key)
  }
  return page
}

function getBannerAltProp(frontmatter: MdxPage['frontmatter']) {
  return (
    frontmatter.bannerAlt ??
    frontmatter.bannerTitle ??
    frontmatter.bannerCredit ??
    frontmatter.title ??
    'Post banner'
  )
}

function getBannerTitleProp(frontmatter: MdxPage['frontmatter']) {
  return (
    frontmatter.bannerTitle ?? frontmatter.bannerAlt ?? frontmatter.bannerCredit
  )
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
  const {request, forceFresh, ttl = defaultTTL, timings} = options
  const key = 'blog:mdx-list-items'
  return cachified({
    cache,
    request,
    timings,
    ttl,
    staleWhileRevalidate: defaultStaleWhileRevalidate,
    forceFresh,
    key,
    getFreshValue: async () => {
      let pages = await getMdxPagesInDirectory('blog', options).then(allPosts =>
        allPosts.filter(p => !p.frontmatter.draft && !p.frontmatter.unlisted),
      )

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
    // NOTE: keyword metadata is not used because it was used and abused by
    // spammers. We use them for sorting on our own site, but we don't list
    // it in the meta tags because it's possible to be penalized for doing so.
    const {keywords, ...extraMeta} = data.page.frontmatter.meta ?? {}
    let title = data.page.frontmatter.title
    const isDraft = data.page.frontmatter.draft
    const isUnlisted = data.page.frontmatter.unlisted
    if (isDraft) title = `(DRAFT) ${title ?? ''}`
    return {
      ...(isDraft || isUnlisted ? {robots: 'noindex'} : null),
      ...getSocialMetas({
        title,
        description: data.page.frontmatter.description,
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
            `Check out this article`,
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

function OptionalUser({
  children,
}: {
  children: (user: ReturnType<typeof useOptionalUser>) => React.ReactElement
}) {
  const user = useOptionalUser()
  return children(user)
}

const mdxComponents = {
  a: AnchorOrLink,
  Themed,
  CloudinaryVideo,
  ThemedBlogImage,
  BlogImage,
  SubscribeForm,
  OptionalUser,
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
  transparentBackground,
}: {
  cloudinaryId: string
  imgProps: JSX.IntrinsicElements['img']
  transparentBackground?: boolean
}) {
  return (
    <img
      className="w-full rounded-lg object-cover py-8"
      {...getImgProps(getImageBuilder(cloudinaryId, imgProps.alt), {
        widths: [350, 550, 700, 845, 1250, 1700, 2550],
        sizes: [
          '(max-width:1023px) 80vw',
          '(min-width:1024px) and (max-width:1620px) 50vw',
          '850px',
        ],
        transformations: {
          background: transparentBackground ? undefined : 'rgb:e6e9ee',
        },
      })}
      {...imgProps}
    />
  )
}

function ThemedBlogImage({
  darkCloudinaryId,
  lightCloudinaryId,
  imgProps,
  transparentBackground,
}: {
  darkCloudinaryId: string
  lightCloudinaryId: string
  imgProps: JSX.IntrinsicElements['img']
  transparentBackground?: boolean
}) {
  return (
    <Themed
      light={
        <BlogImage
          cloudinaryId={lightCloudinaryId}
          imgProps={imgProps}
          transparentBackground={transparentBackground}
        />
      }
      dark={
        <BlogImage
          cloudinaryId={darkCloudinaryId}
          imgProps={imgProps}
          transparentBackground={transparentBackground}
        />
      }
    />
  )
}

function SubscribeForm(props: Record<string, unknown>) {
  const {formId, convertKitTagId, convertKitFormId} = props

  if (
    typeof formId !== 'string' ||
    typeof convertKitFormId !== 'string' ||
    typeof convertKitTagId !== 'string'
  ) {
    console.error(
      `SubscribeForm improperly used. Must have a formId, convertKitFormId, and convertKitTagId`,
      props,
    )
    return null
  }

  return (
    <div className="mb-12 border-t-2 border-b-2 border-team-current p-5">
      <ConvertKitForm
        formId={formId}
        convertKitFormId={convertKitFormId}
        convertKitTagId={convertKitTagId}
      />
    </div>
  )
}

// This exists so we don't have to call new Function for the given code
// for every request for a given blog post/mdx file.
const mdxComponentCache = new LRU<string, ReturnType<typeof getMdxComponent>>({
  max: 1000,
})

function useMdxComponent(code: string) {
  return React.useMemo(() => {
    if (mdxComponentCache.has(code)) {
      return mdxComponentCache.get(code)!
    }
    const component = getMdxComponent(code)
    mdxComponentCache.set(code, component)
    return component
  }, [code])
}

export {
  getMdxPage,
  getMdxDirList,
  getMdxPagesInDirectory,
  mapFromMdxPageToMdxListItem,
  getBlogMdxListItems,
  mdxPageMeta,
  useMdxComponent,
  getBannerTitleProp,
  getBannerAltProp,
}
