import * as React from 'react'
import {useRouteData, Link, json} from 'remix'
import type {HeadersFunction} from 'remix'
import type {KCDLoader, MdxListItem} from 'types'
import {downloadMdxListItemsInDir} from '../../utils/github.server'

export const loader: KCDLoader = async ({request}) => {
  const workshops = await downloadMdxListItemsInDir(
    'workshops',
    new URL(request.url).searchParams.get('bust-cache') === 'true',
  )

  return json(workshops, {
    headers: {
      'Cache-Control': 'public, max-age=60 s-maxage=3600',
    },
  })
}

export const headers: HeadersFunction = ({loaderHeaders}) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') ?? 'no-cache',
  }
}

export function meta() {
  return {
    title: 'Workshops with Kent C. Dodds',
    description: 'Get really good at making software with Kent C. Dodds',
  }
}

function WorkshopsHome() {
  const workshops = useRouteData<Array<MdxListItem>>()
  return (
    <div>
      <header>
        <h1>Kent C. Dodds</h1>
      </header>
      <main>
        {workshops.map(workshop => (
          <p key={workshop.slug}>
            <Link to={`/workshops/${workshop.slug}`}>
              {workshop.frontmatter.meta.title}
            </Link>
            <br />
            <small>{workshop.frontmatter.meta.description}</small>
          </p>
        ))}
      </main>
    </div>
  )
}

export default WorkshopsHome
