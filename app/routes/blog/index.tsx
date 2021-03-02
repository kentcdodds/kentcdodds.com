import React from 'react'
import {useRouteData, Link} from '@remix-run/react'
import type {KCDLoader, PostListing} from 'types'
import {json} from '@remix-run/data'
import {getPosts} from '../../utils/post.server'

export const loader: KCDLoader = async ({context}) => {
  return json(await getPosts(context.octokit), {
    headers: {
      'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  })
}

export function headers() {
  return {
    'cache-control': 'public, max-age=10',
  }
}

export function meta() {
  return {
    title: 'Blog Template',
    description: 'This is a blog template, enjoy!',
  }
}

function BlogHome() {
  const posts = useRouteData<Array<PostListing>>()
  return (
    <div>
      <header>
        <h1>Kent C. Dodds</h1>
      </header>
      <main>
        {posts.map(post => (
          <p key={post.slug}>
            <Link to={`/blog/${post.slug}`}>{post.frontmatter.title}</Link>
            <br />
            <small>{post.frontmatter.description}</small>
          </p>
        ))}
      </main>
    </div>
  )
}

export default BlogHome
