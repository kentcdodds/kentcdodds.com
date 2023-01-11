// this is a placeholder to make /routes/talks catch nested paths

import type {MetaFunction} from '@remix-run/node'
import {getSocialImageWithPreTitle} from '~/images'
import {getDisplayUrl, getUrl} from '~/utils/misc'
import {getSocialMetas} from '~/utils/seo'
import type {LoaderData as TalksLoaderData} from '../talks'

export const meta: MetaFunction = ({parentsData, params}) => {
  const {talks = []} =
    (parentsData['routes/talks'] as TalksLoaderData | undefined) ?? {}
  const talk = params.slug ? talks.find(t => t.slug === params.slug) : null
  const title = talk ? talk.title : '404: Talk not found'
  return {
    ...getSocialMetas({
      title: talk ? `${title} by Kent C. Dodds` : title,
      description: talk ? talk.description : '404: Talk not found',
      url: getUrl(parentsData.root?.requestInfo),
      image: getSocialImageWithPreTitle({
        url: getDisplayUrl(parentsData.root?.requestInfo),
        featuredImage: 'kent/kent-speaking-all-things-open',
        title,
        preTitle: `Checkout this talk by Kent`,
      }),
    }),
  }
}

export default function TalksSlug() {
  return null
}
