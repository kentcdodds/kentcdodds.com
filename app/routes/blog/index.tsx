import * as React from 'react'
import sortBy from 'sort-by'
import {useRouteData, Link, json} from 'remix'
import type {HeadersFunction} from 'remix'
import type {KCDLoader, PostListItem} from 'types'
import {downloadMdxListItemsInDir} from '../../utils/github.server'

export const headers: HeadersFunction = ({loaderHeaders}) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') ?? 'no-cache',
  }
}

export const loader: KCDLoader = async () => {
  const posts = (await downloadMdxListItemsInDir('blog')).sort(
    sortBy('-frontmatter.published'),
  )

  return json(posts, {
    headers: {
      'Cache-Control': 'public, max-age=60 s-maxage=3600',
    },
  })
}

export function meta() {
  return {
    title: 'Blog | Kent C. Dodds',
    description: 'This is the Kent C. Dodds blog',
  }
}

function BlogHome() {
  const posts = useRouteData<Array<PostListItem>>()
  return (
    <div>
      <header>
        <h1>Kent C. Dodds</h1>
      </header>
      <main>
        {posts.map(post => (
          <p key={post.slug}>
            <Link to={`/blog/${post.slug}`}>{post.frontmatter.meta.title}</Link>
            <br />
            <small>{post.frontmatter.meta.description}</small>
          </p>
        ))}
      </main>
    </div>
  )
}

export default BlogHome
