import * as React from 'react'
import {useMatches} from 'remix'
import type {GitHubFile, MdxListItem, MdxPage} from 'types'
import * as mdxBundler from 'mdx-bundler/client'
import config from '../../config'
import {compileMdx} from '../utils/compile-mdx.server'
import {
  downloadDirList,
  downloadMdxFileOrDirectory,
} from '../utils/github.server'
import {AnchorOrLink, getErrorMessage} from '../utils/misc'
import * as redis from './redis.server'
import {HeroSection} from '../components/sections/hero-section'
import {images} from '../images'
import {BlogSection} from '../components/sections/blog-section'
import {articles} from '../../storybook/stories/fixtures'

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
  const fullContentDirPath = `${config.contentSrc.path}/${contentDir}`
  if (!dirList) {
    dirList = (await downloadDirList(fullContentDirPath))
      .map(({name, path}) => ({
        name,
        slug: path.replace(`${fullContentDirPath}/`, '').replace(/\.mdx$/, ''),
      }))
      .filter(({name}) => name !== 'README.md')
    await redis.set(key, JSON.stringify(dirList))
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
    await redis.set(key, JSON.stringify(files))
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
    if (page) await redis.set(key, JSON.stringify(page))
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

function FourOhFour() {
  const matches = useMatches()
  const last = matches[matches.length - 1]
  const pathname = last?.pathname

  return (
    <main>
      <HeroSection
        title="404 - Oh no, you found a page that's missing stuff."
        subtitle={`"${pathname}" is not a page on kentcdodds.com. So sorry.`}
        imageUrl={images.bustedOnewheel()}
        imageAlt={images.bustedOnewheel.alt}
        arrowUrl="#articles"
        arrowLabel="But wait, there is more!"
      />

      {/* TODO: remove fixtures, do something smart */}
      <div id="articles" />
      <BlogSection
        articles={articles}
        title="Looking for something to read?"
        description="Have a look at these articles."
      />
    </main>
  )
}

export {
  getMdxPage,
  getMdxPagesInDirectory,
  mapFromMdxPageToMdxListItem,
  getBlogMdxListItems,
  mdxPageMeta,
  FourOhFour,
  getMdxComponent,
  refreshCacheForMdx,
  refreshDirListForMdx,
}
