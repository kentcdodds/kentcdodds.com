import * as React from 'react'
import {useRouteData, Link} from '@remix-run/react'
import type {KCDLoader, MdxListItem} from 'types'
import {json} from '@remix-run/data'
import {downloadMdxListItemsInDir} from '../../utils/github.server'

export const loader: KCDLoader = async ({context}) => {
  const workshops = await downloadMdxListItemsInDir(
    context.octokit,
    'workshops',
  )

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
