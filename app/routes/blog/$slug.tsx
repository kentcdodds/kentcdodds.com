import React from 'react'
import {json} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import {Link} from 'react-router-dom'
import {getMDXComponent} from 'mdx-bundler/client'
import type {Post, KCDLoader} from 'types'
import {useSSRLayoutEffect} from '../../shared'
import {useTheme} from '../../theme-provider'
import {getPost} from '../../utils/post.server'

export const loader: KCDLoader<{slug: string}> = async ({params, context}) => {
  const post = await getPost(params.slug, context.octokit)

  const oneDay = 86400
  const secondsSincePublished =
    (new Date().getTime() - post.frontmatter.published) / 1000
  const barelyPublished = secondsSincePublished < oneDay

  // If this was barely published then only cache it for one minute, giving you
  // a chance to make edits and have them show up within a minute for visitors.
  // But after the first day, then cache for a week, then if you make edits
  // they'll show up eventually, but you don't have to rebuild and redeploy to
  // get them there.
  const maxAge = barelyPublished ? 60 : oneDay * 7

  // If the max-age has expired, we'll still send the current cached version of
  // the post to visitors until the CDN has cached the new one. If it's been
  // expired for more than one month though (meaning nobody has visited this
  // page for a month) we'll make them wait to see the newest version.
  const swr = oneDay * 30

  return json(post, {
    headers: {
      'cache-control': `public, max-age=${maxAge}, stale-while-revalidate=${swr}`,
    },
  })
}

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
  const {code, frontmatter} = useRouteData<Post>()
  const Component = React.useMemo(() => getMDXComponent(code), [code])

  return (
    <>
      <header>
        <h1>{frontmatter.title}</h1>
        <p>{frontmatter.description}</p>
      </header>
      <main>
        <Component components={{a: AnchorOrLink}} />
      </main>
    </>
  )
}

export default PostScreen

/*
eslint
  no-void: "off",
*/
