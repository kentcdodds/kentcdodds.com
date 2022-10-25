import type {LoaderArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import invariant from 'tiny-invariant'
import {downloadMdxFilesCached} from '~/utils/mdx'

export async function loader({params, request}: LoaderArgs) {
  invariant(typeof params.slug === 'string', 'slug is required')
  invariant(typeof params.contentDir === 'string', 'contentDir is required')
  const pageFiles = await downloadMdxFilesCached(
    params.contentDir,
    params.slug,
    {
      request,
    },
  )
  return json(pageFiles)
}
