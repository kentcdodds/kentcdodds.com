import React from 'react'
import {useRouteData} from '@remix-run/react'
import type {KCDLoader, Post} from 'types'
import {
  FourOhFour,
  loadMdxPage,
  mdxPageMeta,
  getMdxComponent,
} from '../../utils/mdx'

export const loader: KCDLoader<{slug: string}> = async ({params, context}) => {
  return loadMdxPage({
    rootDir: 'blog',
    octokit: context.octokit,
    slug: params.slug,
  })
}

export const meta = mdxPageMeta

export default function MdxScreenBase() {
  const post = useRouteData<Post | null>()

  if (post) return <MdxScreen post={post} />
  else return <FourOhFour />
}

function MdxScreen({post}: {post: Post}) {
  const {code, frontmatter} = post
  const Component = React.useMemo(() => getMdxComponent(code), [code])

  return (
    <>
      <header>
        <h1>{frontmatter.meta.title}</h1>
        <p>{frontmatter.meta.description}</p>
      </header>
      <main>
        <Component />
      </main>
    </>
  )
}
