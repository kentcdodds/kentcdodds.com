import React from 'react'
import {useRouteData} from '@remix-run/react'
import type {Post} from 'types'

export function headers({loaderHeaders}: {loaderHeaders: Headers}) {
  return {
    'cache-control': loaderHeaders.get('cache-control'),
  }
}

export function meta({data: post}: {data: Post}) {
  return {
    title: post.frontmatter.title,
  }
}

function PostScreen() {
  const {js, frontmatter} = useRouteData<Post>()
  // eslint-disable-next-line
  const fn = new Function('React', js)
  const Component = fn(React)
  return (
    <>
      <header>
        <h1>{frontmatter.title}</h1>
        <p>{frontmatter.description}</p>
      </header>
      <main>
        <Component />
      </main>
    </>
  )
}

export default PostScreen
