import React from 'react'
import {json} from '@remix-run/node'
import {useRouteData} from '@remix-run/react'
import type {KCDLoader, Post} from 'types'
import {
  FourOhFour,
  getMdxPage,
  mdxPageMeta,
  getMdxComponent,
} from '../../utils/mdx'

export const loader: KCDLoader<{slug: string}> = async ({params, context}) => {
  const page = await getMdxPage({
    rootDir: 'blog',
    octokit: context.octokit,
    slug: params.slug,
  })

  if (!page) return json(null, {status: 404})
  return json({page})
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
