import * as React from 'react'
import {useRouteData, Link, json} from 'remix'
import type {HeadersFunction} from 'remix'
import type {KCDLoader, MdxListItem} from 'types'
import {
  getMdxPagesInDirectory,
  mapFromMdxPageToMdxListItem,
} from '../../utils/mdx'

type LoaderData = {
  workshops: Array<MdxListItem>
}

export const loader: KCDLoader = async ({request}) => {
  const pages = await getMdxPagesInDirectory(
    'workshops',
    new URL(request.url).searchParams.get('bust-cache') === 'true',
  )

  const data: LoaderData = {workshops: pages.map(mapFromMdxPageToMdxListItem)}
  return json(data, {
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
  const data = useRouteData<LoaderData>()
  return (
    <div>
      <header>
        <h2>Kent C. Dodds</h2>
      </header>
      <main>
        {data.workshops.map(workshop => (
          <p key={workshop.slug}>
            <Link to={`/workshops/${workshop.slug}`}>
              {workshop.frontmatter.title ?? 'Untitled Workshop'}
            </Link>
            <br />
            <small>
              {workshop.frontmatter.description ?? 'Description TBA'}
            </small>
          </p>
        ))}
      </main>
    </div>
  )
}

export default WorkshopsHome
