import type {DataFunctionArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import {getDomainUrl} from '~/utils/misc'
import {searchKCD} from '~/utils/search.server'

export async function loader({request}: DataFunctionArgs) {
  const query = new URL(request.url).searchParams.get('query')
  const domainUrl = getDomainUrl(request)
  if (typeof query !== 'string' || !query) {
    return json({error: 'Invalid query'}, {status: 400})
  }

  const results = await searchKCD({request, query})

  return json(
    results.map(({route, segment, title}) => ({
      url: `${domainUrl}${route}`,
      segment,
      title,
    })),
  )
}
