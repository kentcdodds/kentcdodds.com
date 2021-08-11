import * as React from 'react'
import type {GitHubFile, MdxListItem, MdxPage, Request} from 'types'
import * as mdxBundler from 'mdx-bundler/client'
import {compileMdx} from '../utils/compile-mdx.server'
import {
  downloadDirList,
  downloadMdxFileOrDirectory,
} from '../utils/github.server'
import {AnchorOrLink} from '../utils/misc'
import * as redis from './redis.server'
import type {Timings} from './metrics.server'

type Options = {forceFresh?: boolean; request?: Request; timings?: Timings}

const getCompiledKey = (contentDir: string, slug: string) =>
  `${contentDir}:${slug}:compiled`

async function getMdxPage(
  {
    contentDir,
    slug,
  }: {
    contentDir: string
    slug: string
  },
  options: Options,
): Promise<MdxPage | null> {
  return redis.cachified({
    ...options,
    // reusing the same key as compiledMdxCached because we just return that
    // exact same value. Cachifying this allows us to skip getting the cached files
    key: getCompiledKey(contentDir, slug),
    getFreshValue: async () => {
      const pageFiles = await downloadMdxFilesCached(contentDir, slug, options)
      const page = await compileMdxCached(contentDir, slug, pageFiles, options)
      return page
    },
  })
}

async function getMdxPagesInDirectory(contentDir: string, options: Options) {
  const dirList = await getMdxDirList(contentDir, options)

  // our octokit throttle plugin will make sure we don't hit the rate limit
  const pageDatas = await Promise.all(
    dirList.map(async ({slug}) => {
      return {
        files: await downloadMdxFilesCached(contentDir, slug, options),
        slug,
      }
    }),
  )

  const pages: Array<MdxPage> = []
  for (const pageData of pageDatas) {
    // esbuild is already optimized to use as many resources as possible
    // so we don't want these running at the same time otherwise we'll
    // run out of memory.
    // eslint-disable-next-line no-await-in-loop
    const page = await compileMdxCached(
      contentDir,
      pageData.slug,
      pageData.files,
      options,
    )
    if (page) pages.push(page)
  }
  return pages
}

const getDirListKey = (contentDir: string) => `${contentDir}:dir-list`

async function getMdxDirList(
  contentDir: string,
  {request, forceFresh, timings}: Options,
) {
  return redis.cachified({
    key: getDirListKey(contentDir),
    forceFresh,
    request,
    timings,
    checkValue: (value: unknown) => Array.isArray(value) && value.length > 0,
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
  {request, forceFresh, timings}: Options,
): Promise<Array<GitHubFile>> {
  return redis.cachified({
    key: getDownloadKey(contentDir, slug),
    forceFresh,
    request,
    timings,
    checkValue: (value: unknown) => Array.isArray(value) && value.length > 0,
    getFreshValue: async () =>
      downloadMdxFileOrDirectory(`${contentDir}/${slug}`),
  })
}

async function compileMdxCached(
  contentDir: string,
  slug: string,
  files: Array<GitHubFile>,
  {request, forceFresh, timings}: Options,
) {
  return redis.cachified({
    key: getCompiledKey(contentDir, slug),
    forceFresh,
    request,
    timings,
    checkValue: (value: unknown) => value != undefined,
    getFreshValue: async () => {
      const page = await compileMdx<MdxPage['frontmatter']>(slug, files)
      if (page) {
        return {...page, slug}
      } else {
        return null
      }
    },
  })
}

async function getBlogMdxListItems({request, timings, forceFresh}: Options) {
  return redis.cachified({
    key: 'blog-mdx-list-items',
    request,
    timings,
    forceFresh,
    getFreshValue: async () => {
      let pages = await getMdxPagesInDirectory('blog', {request, forceFresh})

      pages = pages.sort((a, z) => {
        const aTime = new Date(a.frontmatter.date ?? '').getTime()
        const zTime = new Date(z.frontmatter.date ?? '').getTime()
        return aTime > zTime ? -1 : aTime === zTime ? 0 : 1
      })

      return pages.map(mapFromMdxPageToMdxListItem)
    },
  })
}

function mdxPageMeta({data}: {data: {page: MdxPage | null} | null}) {
  if (data?.page) {
    return {
      title: data.page.frontmatter.title,
      description: data.page.frontmatter.description,
      ...data.page.frontmatter.meta,
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
    return <Component components={{a: AnchorOrLink, ...components}} {...rest} />
  }
  return KCDMdxComponent
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
