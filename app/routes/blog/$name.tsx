import React from 'react'
import {useRouteData} from '@remix-run/react'
import {Link} from 'react-router-dom'
// @ts-expect-error no types and can't declare for some reason?
import {MDXProvider, mdx} from '@mdx-js/react'
import type {Post} from 'types'
import {useSSRLayoutEffect} from '../../shared'
import {useTheme} from '../../theme-provider'

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

function loadTweet(event: MouseEvent) {
  const tweetNode = (event.target as HTMLButtonElement).closest(
    '.twitter-tweet',
  )
  if (tweetNode) {
    void window.twttr?.widgets.load(tweetNode)
  }
}

function useEmbeddedTweets() {
  const [theme] = useTheme()
  useSSRLayoutEffect(() => {
    const reducedData = window.matchMedia('(prefers-reduced-data: reduce)')
      .matches
    for (const tweetNode of document.body.querySelectorAll<HTMLElement>(
      '.twitter-tweet',
    )) {
      tweetNode.dataset.theme = theme
      if (reducedData) {
        const loadTweetButton = document.createElement('button')
        loadTweetButton.onclick = loadTweet
        loadTweetButton.textContent = 'Load tweet'
        tweetNode.append(loadTweetButton)
      }
    }
    if (!reducedData) {
      void window.twttr?.widgets.load()
    }
  }, [])
}

type AnchorProps = React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>

function AnchorOrLink({href = '', ...rest}: AnchorProps) {
  if (href.startsWith('http')) {
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    return <a {...rest} />
  } else {
    // @ts-expect-error I'm not sure what to do about extra props other than to forward them
    return <Link to={href} {...rest} />
  }
}

function PostScreen() {
  useEmbeddedTweets()
  const {js, frontmatter} = useRouteData<Post>()
  const scope = {React, Link, mdx}
  // eslint-disable-next-line
  const fn = new Function(...Object.keys(scope), js)
  const Component = fn(...Object.values(scope))

  return (
    <MDXProvider components={{a: AnchorOrLink}}>
      <header>
        <h1>{frontmatter.title}</h1>
        <p>{frontmatter.description}</p>
      </header>
      <main>
        <Component />
      </main>
    </MDXProvider>
  )
}

export default PostScreen

/*
eslint
  no-void: "off",
*/
