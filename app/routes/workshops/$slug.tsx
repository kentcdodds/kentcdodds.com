import React from 'react'
import {useRouteData, json} from 'remix'
import type {MdxPage, KCDLoader} from 'types'
import {
  FourOhFour,
  getMdxPage,
  mdxPageMeta,
  getMdxComponent,
} from '../../utils/mdx'
import {getScheduledEvents} from '../../utils/workshop-tickets.server'
import type {WorkshopEvent} from '../../utils/workshop-tickets.server'

export const loader: KCDLoader<{slug: string}> = async ({request, params}) => {
  const page = await getMdxPage({
    contentDir: 'workshops',
    slug: params.slug,
    bustCache: new URL(request.url).searchParams.get('bust-cache') === 'true',
  })
  const events = await getScheduledEvents()
  const workshop = events.find(
    ({metadata}) => metadata.workshopSlug === params.slug,
  )
  return json({page, workshop})
}

export const meta = mdxPageMeta

export default function MdxScreenBase() {
  const data = useRouteData<{page: MdxPage; workshop?: WorkshopEvent} | null>()

  if (data) return <MdxScreen mdxPage={data.page} workshop={data.workshop} />
  else return <FourOhFour />
}

function MdxScreen({
  mdxPage,
  workshop,
}: {
  mdxPage: MdxPage
  workshop?: WorkshopEvent
}) {
  const {code, frontmatter} = mdxPage
  const Component = React.useMemo(() => getMdxComponent(code), [code])

  return (
    <>
      <header>
        <h2>{frontmatter.title}</h2>
        <p>{frontmatter.description}</p>
      </header>
      {workshop ? (
        <div>
          <div>We have a workshop!</div>
          <a href={workshop.url}>{workshop.title}</a>
          <pre>{JSON.stringify(workshop, null, 2)}</pre>
        </div>
      ) : (
        'No workshop scheduled'
      )}
      <main>
        <Component />
      </main>
    </>
  )
}
