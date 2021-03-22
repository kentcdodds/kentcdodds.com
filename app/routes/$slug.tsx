import React from 'react'
import {json} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import type {MdxPage, KCDLoader} from 'types'
import {
  FourOhFour,
  getMdxPage,
  mdxPageMeta,
  getMdxComponent,
} from '../utils/mdx'

export const loader: KCDLoader<{slug: string}> = async ({params, context}) => {
  const page = await getMdxPage({
    rootDir: 'pages',
    octokit: context.octokit,
    slug: params.slug,
  })
  if (!page) return json(null, {status: 404})
  return json({page})
}

export const meta = mdxPageMeta

export default function MdxScreenBase() {
  const data = useRouteData<{page: MdxPage} | null>()

  if (data) return <MdxScreen mdxPage={data.page} />
  else return <FourOhFour />
}

function MdxScreen({mdxPage}: {mdxPage: MdxPage}) {
  const {code, frontmatter} = mdxPage
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
