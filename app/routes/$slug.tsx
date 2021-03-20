import React from 'react'
import {json} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import {getMDXComponent} from 'mdx-bundler/client'
import type {MdxPage, KCDLoader} from 'types'
import {AnchorOrLink} from '../shared'
import {compileMdx} from '../utils/compile-mdx.server'
import {downloadMdxFileOrDirectory} from '../utils/github.server'

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
type LoaderBody = PartialBy<MdxPage, 'code' | 'frontmatter'>

export const loader: KCDLoader<{slug: string}> = async ({params, context}) => {
  const {slug} = params
  const pageFiles = await downloadMdxFileOrDirectory(
    context.octokit,
    `pages/${slug}`,
  )

  const result = await compileMdx<MdxPage['frontmatter']>(slug, pageFiles)
  const {code, frontmatter} = result ?? {}
  return json({slug, code, frontmatter}, {status: code ? 200 : 404})
}

export function meta({data}: {data: LoaderBody}) {
  if (data.frontmatter) {
    return data.frontmatter.meta
  } else {
    return {
      title: 'Not found',
      description:
        'You landed on a page that Kody the Coding Koala could not find 🐨😢',
    }
  }
}

export default function MdxScreenBase() {
  const mdxPage = useRouteData<LoaderBody>()

  if (mdxPage.code) return <MdxScreen mdxPage={mdxPage as MdxPage} />

  return (
    <>
      <header>
        <h1>404 oh no</h1>
      </header>
      <main>
        {`Oh no, you found a page that's missing stuff... ${mdxPage.slug} is not a page on kentcdodds.com. So sorry...`}
      </main>
    </>
  )
}

function MdxScreen({mdxPage}: {mdxPage: MdxPage}) {
  const {code, frontmatter} = mdxPage
  const Component = React.useMemo(() => getMDXComponent(code), [code])

  return (
    <>
      <header>
        <h1>{frontmatter.meta.title}</h1>
        <p>{frontmatter.meta.description}</p>
      </header>
      <main>
        <Component components={{a: AnchorOrLink}} />
      </main>
    </>
  )
}
