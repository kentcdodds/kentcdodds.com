import type {Request} from 'types'
import {getBlogMdxListItems} from './mdx'

async function getBlogRecommendations(request: Request) {
  const posts = await getBlogMdxListItems(
    new URL(request.url).searchParams.get('bust-cache') === 'true',
  )

  return posts
}

export {getBlogRecommendations}
