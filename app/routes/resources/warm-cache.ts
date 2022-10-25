import type {LoaderArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import {getBlogRecommendations} from '~/utils/blog.server'
import {getBlogMdxListItems} from '~/utils/mdx'

export async function loader({request}: LoaderArgs) {
  void getBlogMdxListItems({request}).then(() => {
    console.log('mdx list items loaded. Getting recommendations...')
    void getBlogRecommendations(request).then(() => {
      console.log('blog recommendations finished')
    })
  })
  return json({started: true})
}
