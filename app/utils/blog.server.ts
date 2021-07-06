import type {Request} from 'types'
import {getMdxPagesInDirectory, mapFromMdxPageToMdxListItem} from './mdx'

async function getBlogRecommendations(request: Request) {
  let pages = await getMdxPagesInDirectory(
    'blog',
    new URL(request.url).searchParams.get('bust-cache') === 'true',
  )

  pages = pages.sort((a, z) => {
    const aTime = new Date(a.frontmatter.date ?? '').getTime()
    const zTime = new Date(z.frontmatter.date ?? '').getTime()
    return aTime > zTime ? -1 : aTime === zTime ? 0 : 1
  })

  return pages.map(mapFromMdxPageToMdxListItem)
}

export {getBlogRecommendations}
