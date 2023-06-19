// this is a placeholder to make /routes/talks catch nested paths

import {type V2_MetaFunction} from '@remix-run/node'
import {getSocialImageWithPreTitle} from '~/images'
import {getDisplayUrl, getUrl} from '~/utils/misc'
import {getSocialMetas} from '~/utils/seo'
import {
  type loader as TalkLoader,
  type LoaderData as TalksLoaderData,
} from '../talks'
import {type RootLoaderType, type LoaderData as RootLoaderData} from '~/root'

export const meta: V2_MetaFunction<
  {},
  {root: RootLoaderType; 'routes/calls': typeof TalkLoader}
> = ({matches, params}) => {
  const {talks = []} =
    (matches.find(m => m.id === 'routes/calls')?.data as
      | TalksLoaderData
      | undefined) ?? {}
  const {requestInfo} = matches.find(m => m.id === 'root')
    ?.data as RootLoaderData

  const talk = params.slug ? talks.find(t => t.slug === params.slug) : null
  const title = talk ? talk.title : '404: Talk not found'
  return getSocialMetas({
    title: talk ? `${title} by Kent C. Dodds` : title,
    description: talk ? talk.description : '404: Talk not found',
    url: getUrl(requestInfo),
    image: getSocialImageWithPreTitle({
      url: getDisplayUrl(requestInfo),
      featuredImage: 'kent/kent-speaking-all-things-open',
      title,
      preTitle: `Checkout this talk by Kent`,
    }),
  })
}

export default function TalksSlug() {
  return null
}
