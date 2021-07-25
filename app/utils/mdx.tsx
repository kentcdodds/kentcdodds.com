import * as React from 'react'
import type {GitHubFile, MdxListItem, MdxPage} from 'types'
import * as mdxBundler from 'mdx-bundler/client'
import {compileMdx} from '../utils/compile-mdx.server'
import {
  downloadDirList,
  downloadMdxFileOrDirectory,
} from '../utils/github.server'
import {AnchorOrLink, getErrorMessage} from '../utils/misc'
import * as redis from './redis.server'

async function getMdxPage({
  contentDir,
  slug,
}: {
  contentDir: string
  slug: string
}): Promise<MdxPage | null> {
  const pageFiles = await downloadMdxFilesCached(contentDir, slug)
  const page = await compileMdxCached(contentDir, slug, pageFiles)
  if (page) {
    return {...page, slug}
  } else {
    return null
  }
}

async function getMdxPagesInDirectory(contentDir: string) {
  const dirList = await getMdxDirListCached(contentDir)

  // our octokit throttle plugin will make sure we don't hit the rate limit
  const pageDatas = await Promise.all(
    dirList.map(async ({slug}) => {
      return {files: await downloadMdxFilesCached(contentDir, slug), slug}
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
    )
    if (page) pages.push({slug: pageData.slug, ...page})
  }
  return pages
}

const getDirListKey = (contentDir: string) => `${contentDir}:dir-list`

async function getMdxDirListCached(contentDir: string) {
  const key = getDirListKey(contentDir)
  let dirList: Array<{name: string; slug: string}> | undefined
  try {
    const cached = await redis.get(key)
    if (cached) dirList = JSON.parse(cached)
  } catch (error: unknown) {
    console.error(`error with cache at ${key}`, getErrorMessage(error))
  }
  const fullContentDirPath = `content/${contentDir}`
  if (!dirList) {
    dirList = (await downloadDirList(fullContentDirPath))
      .map(({name, path}) => ({
        name,
        slug: path.replace(`${fullContentDirPath}/`, '').replace(/\.mdx$/, ''),
      }))
      .filter(({name}) => name !== 'README.md')
    if (dirList.length) {
      void redis.set(key, JSON.stringify(dirList)).catch(error => {
        console.error(`error setting redis.${key}`, getErrorMessage(error))
      })
    }
  }
  return dirList
}

const getDownloadKey = (contentDir: string, slug: string) =>
  `${contentDir}:${slug}:downloaded`

async function downloadMdxFilesCached(
  contentDir: string,
  slug: string,
): Promise<Array<GitHubFile>> {
  const contentPath = `${contentDir}/${slug}`
  const key = getDownloadKey(contentDir, slug)
  let files
  try {
    const cached = await redis.get(key)
    if (cached) files = JSON.parse(cached)
  } catch (error: unknown) {
    console.error(`error with cache at ${key}`, getErrorMessage(error))
  }
  if (!files) {
    files = await downloadMdxFileOrDirectory(contentPath)
    if (files.length) {
      void redis.set(key, JSON.stringify(files)).catch(error => {
        console.error(`error setting redis.${key}`, getErrorMessage(error))
      })
    }
  }
  return files
}

const getCompiledKey = (contentDir: string, slug: string) =>
  `${contentDir}:${slug}:compiled`

async function compileMdxCached(
  contentDir: string,
  slug: string,
  files: Array<GitHubFile>,
) {
  const key = getCompiledKey(contentDir, slug)
  let page
  try {
    const cached = await redis.get(key)
    if (cached) page = JSON.parse(cached)
  } catch (error: unknown) {
    console.error(`error with cache at ${key}`, getErrorMessage(error))
  }
  if (!page) {
    page = await compileMdx<MdxPage['frontmatter']>(slug, files)
    if (page) {
      void redis.set(key, JSON.stringify(page)).catch(error => {
        console.error(`error setting redis.${key}`, getErrorMessage(error))
      })
    }
  }
  if (!page) return null
  return {slug, ...page}
}

async function refreshDirListForMdx(contentDir: string) {
  const dirListKey = getDirListKey(contentDir)
  await redis.del(dirListKey)
  await getMdxDirListCached(contentDir)
}

async function refreshCacheForMdx({
  contentDir,
  slug,
}: {
  contentDir: string
  slug: string
}) {
  const downloadKey = getDownloadKey(contentDir, slug)
  await redis.del(downloadKey)
  const compiledKey = getCompiledKey(contentDir, slug)
  await redis.del(compiledKey)

  // now prime the cache again
  await compileMdxCached(
    contentDir,
    slug,
    await downloadMdxFilesCached(contentDir, slug),
  )
}

async function getBlogMdxListItems() {
  let pages = await getMdxPagesInDirectory('blog')

  pages = pages.sort((a, z) => {
    const aTime = new Date(a.frontmatter.date ?? '').getTime()
    const zTime = new Date(z.frontmatter.date ?? '').getTime()
    return aTime > zTime ? -1 : aTime === zTime ? 0 : 1
  })

  return pages.map(mapFromMdxPageToMdxListItem)
}

function mdxPageMeta({data}: {data: {page: MdxPage} | null}) {
  if (data) {
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
  getMdxPagesInDirectory,
  mapFromMdxPageToMdxListItem,
  getBlogMdxListItems,
  mdxPageMeta,
  useMdxComponent,
  refreshCacheForMdx,
  refreshDirListForMdx,
}
