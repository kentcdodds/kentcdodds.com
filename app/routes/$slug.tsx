import * as React from 'react'
import {useRouteData, json} from 'remix'
import type {MdxPage, KCDLoader} from 'types'
import {getMdxPage, mdxPageMeta, getMdxComponent} from '../utils/mdx'
import {FourOhFour} from '../components/errors'

export const loader: KCDLoader<{slug: string}> = async ({params}) => {
  const page = await getMdxPage({
    contentDir: 'pages',
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
        <h2>{frontmatter.title}</h2>
        <p>{frontmatter.description}</p>
      </header>
      <main>
        <Component />
      </main>
    </>
  )
}
