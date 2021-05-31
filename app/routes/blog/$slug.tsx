import React from 'react'
import {useRouteData, json} from 'remix'
import type {HeadersFunction} from 'remix'
import type {KCDLoader, Post} from 'types'
import {
  FourOhFour,
  getMdxPage,
  mdxPageMeta,
  getMdxComponent,
} from '../../utils/mdx'

export const headers: HeadersFunction = ({loaderHeaders}) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') ?? 'no-cache',
  }
}

export const loader: KCDLoader<{slug: string}> = async ({params}) => {
  const page = await getMdxPage({
    rootDir: 'blog',
    slug: params.slug,
  })

  if (!page) return json(null, {status: 404})
  return json(
    {page},
    {
      headers: {
        'Cache-Control': 'public, max-age=60 s-maxage=3600',
      },
    },
  )
}

export const meta = mdxPageMeta

export default function MdxScreenBase() {
  const data = useRouteData<{page: Post} | null>()

  if (data) return <MdxScreen post={data.page} />
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
