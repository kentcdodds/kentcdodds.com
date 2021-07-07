import {getBlogMdxListItems} from './mdx'

async function getBlogRecommendations() {
  const posts = await getBlogMdxListItems()

  return posts
}

export {getBlogRecommendations}
