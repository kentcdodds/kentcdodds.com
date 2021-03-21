import React from 'react'
import {useRouteData} from '@remix-run/react'
import type {MdxPage, KCDLoader} from 'types'
import {
  FourOhFour,
  loadMdxPage,
  mdxPageMeta,
  getMdxComponent,
} from '../utils/mdx'

export const loader: KCDLoader<{slug: string}> = async ({params, context}) => {
  return loadMdxPage({
    rootDir: 'pages',
    octokit: context.octokit,
    slug: params.slug,
  })
}

export const meta = mdxPageMeta

export default function MdxScreenBase() {
  const mdxPage = useRouteData<MdxPage | null>()

  if (mdxPage) return <MdxScreen mdxPage={mdxPage} />
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
