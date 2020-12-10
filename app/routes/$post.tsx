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
    title: post.attributes.title,
  }
}

function PostScreen() {
  const post = useRouteData<Post>()
  return (
    <>
      <header>
        <h1>{post.attributes.title}</h1>
        <p>{post.attributes.description}</p>
      </header>
      <main dangerouslySetInnerHTML={{__html: post.html ?? ''}} />
    </>
  )
}

export default PostScreen
