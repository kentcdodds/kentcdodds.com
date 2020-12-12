import React from 'react'
import {useRouteData, Link} from '@remix-run/react'
import type {PostListing} from 'types'

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

export default function Index() {
  const posts = useRouteData<Array<PostListing>>()
  return (
    <div>
      <header>
        <h1>Kent C. Dodds</h1>
      </header>
      <main>
        {posts.map(post => (
          <p key={post.name}>
            <Link to={`/blog/${post.name}`}>{post.frontmatter.title}</Link>
            <br />
            <small>{post.frontmatter.description}</small>
          </p>
        ))}
      </main>
    </div>
  )
}
