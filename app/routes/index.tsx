import React from 'react'
import {useRouteData, Link} from '@remix-run/react'
import type {Post} from 'types'

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
  const posts = useRouteData<Array<Post>>()
  return (
    <div>
      <header>
        <h1>Kent C. Dodds</h1>
      </header>
      <main>
        {posts.map(post => (
          <p key={post.name}>
            <Link to={post.name}>{post.attributes.title}</Link>
            <br />
            <small>{post.attributes.description}</small>
          </p>
        ))}
      </main>
    </div>
  )
}
