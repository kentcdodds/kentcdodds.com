import * as React from 'react'
import {useRouteData, json} from 'remix'
import type {MdxPage, KCDLoader} from 'types'
import {
  getMdxPage,
  mdxPageMeta,
  getMdxComponent,
  refreshCacheForMdx,
} from '../utils/mdx'
import {FourOhFour} from '../components/errors'
import {getUser} from '../utils/session.server'

export const loader: KCDLoader<{slug: string}> = async ({params, request}) => {
  const pageMeta = {
    contentDir: 'pages',
    slug: params.slug,
  }
  if (new URL(request.url).searchParams.has('fresh')) {
    const user = await getUser(request)
    if (user?.role === 'ADMIN') {
      await refreshCacheForMdx(pageMeta)
    }
  }
  const page = await getMdxPage(pageMeta)

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
        <h2>{frontmatter.title}</h2>
        <p>{frontmatter.description}</p>
      </header>
      <main>
        <Component />
      </main>
    </>
  )
}
