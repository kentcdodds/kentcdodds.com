import React from 'react'
import {useRouteData, json} from 'remix'
import type {HeadersFunction} from 'remix'
import type {MdxPage, KCDLoader} from 'types'
import {
  FourOhFour,
  getMdxPage,
  mdxPageMeta,
  getMdxComponent,
} from '../utils/mdx'

export const headers: HeadersFunction = ({loaderHeaders}) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') ?? 'no-cache',
  }
}

export const loader: KCDLoader<{slug: string}> = async ({request, params}) => {
  const page = await getMdxPage({
    rootDir: 'pages',
    slug: params.slug,
    bustCache: new URL(request.url).searchParams.get('bust-cache') === 'true',
  })
  if (!page) return json(null, {status: 404})
  return json({
    page,
    headers: {
      'Cache-Control': 'public, max-age=60 s-maxage=3600',
    },
  })
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
        <h2>{frontmatter.meta.title}</h2>
        <p>{frontmatter.meta.description}</p>
      </header>
      <main>
        <Component />
      </main>
    </>
  )
}
