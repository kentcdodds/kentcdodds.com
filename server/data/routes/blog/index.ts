import type {Loader} from '@remix-run/data'
import {json} from '@remix-run/data'
import {getPosts} from '../../post'

const loader: Loader = async () => {
  return json(await getPosts(), {
    headers: {
      'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  })
}

export {loader}
