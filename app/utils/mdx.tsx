import * as React from 'react'
import {useMatches} from 'remix'
import type {MdxListItem, MdxPage} from 'types'
import pLimit from 'p-limit'
import * as mdxBundler from 'mdx-bundler/client'
import config from '../../config'
import {compileMdx} from '../utils/compile-mdx.server'
import {
  downloadDirList,
  downloadMdxFileOrDirectory,
} from '../utils/github.server'
import {AnchorOrLink, getErrorMessage, typedBoolean} from '../utils/misc'
import * as redis from './redis.server'

async function getMdxPage({
  contentDir,
  slug,
  bustCache,
}: {
  contentDir: string
  slug: string
  bustCache: boolean
}): Promise<MdxPage | null> {
  const key = `${contentDir}/${slug}`
  if (bustCache) {
    await redis.del(key)
  } else {
    try {
      const cached = await redis.get(key)
      if (cached) return JSON.parse(cached)
    } catch (error: unknown) {
      console.error(getErrorMessage(error))
    }
  }

  const pageFiles = await downloadMdxFileOrDirectory(key, bustCache)
  const page = await compileMdx<MdxPage['frontmatter']>(slug, pageFiles)
  if (page) {
    const mdxPage = {...page, slug}
    await redis.set(key, JSON.stringify(mdxPage))
    return mdxPage
  } else {
    return null
  }
}

async function getMdxPagesInDirectory(contentDir: string, bustCache: boolean) {
  const key = `dir-list:${contentDir}`
  let dirList: Array<{name: string; slug: string}> | undefined
  if (bustCache) {
    await redis.del(key)
  } else {
    try {
      const cached = await redis.get(key)
      if (cached) dirList = JSON.parse(cached)
    } catch (error: unknown) {
      console.error(getErrorMessage(error))
    }
  }
  const fullContentDirPath = `${config.contentSrc.path}/${contentDir}`
  if (!dirList) {
    dirList = (await downloadDirList(fullContentDirPath, bustCache)).map(
      ({name, path}) => ({
        name,
        slug: path.replace(`${fullContentDirPath}/`, '').replace(/\.mdx$/, ''),
      }),
    )
  }
  await redis.set(key, JSON.stringify(dirList))

  const limit = pLimit(20)

  const pages = await Promise.all(
    dirList
      .filter(({name}) => name !== 'README.md')
      .map(
        async ({slug}): Promise<MdxPage | null> =>
          limit(() => getMdxPage({contentDir, slug, bustCache})),
      ),
  )
  return pages.filter(typedBoolean)
}

async function getBlogMdxListItems(bustCache: boolean) {
  let pages = await getMdxPagesInDirectory('blog', bustCache)

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
    <>
      <header>
        <h2>404 oh no</h2>
      </header>
      <main>
        {`Oh no, you found a page that's missing stuff... "${pathname}" is not a page on kentcdodds.com. So sorry...`}
      </main>
    </>
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
}
