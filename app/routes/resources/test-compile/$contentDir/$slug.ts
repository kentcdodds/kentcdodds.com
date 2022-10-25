import type {LoaderArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import invariant from 'tiny-invariant'
import {getMdxPage} from '~/utils/mdx'

export async function loader({params, request}: LoaderArgs) {
  invariant(typeof params.slug === 'string', 'slug is required')
  invariant(typeof params.contentDir === 'string', 'contentDir is required')
  const page = await getMdxPage(
    {contentDir: params.contentDir, slug: params.slug},
    {request},
  )
  return json(page)
}
