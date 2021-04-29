import * as React from 'react'
import {useRouteData, Link, json} from 'remix'
import type {KCDLoader, MdxListItem} from 'types'
import {downloadMdxListItemsInDir} from '../../utils/github.server'

export const loader: KCDLoader = async () => {
  const workshops = await downloadMdxListItemsInDir('workshops')

  return json(workshops)
}

export function headers() {
  return {
    'cache-control': 'public, max-age=10',
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
