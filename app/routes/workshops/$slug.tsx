import React from 'react'
import {json} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import {getMDXComponent} from 'mdx-bundler/client'
import type {WorkshopPage, KCDLoader} from 'types'
import {AnchorOrLink} from '../../shared'
import {downloadMdxFileOrDirectory} from '../../utils/github.server'
import {compileMdx} from '../../utils/compile-mdx.server'

export const loader: KCDLoader<{slug: string}> = async ({params, context}) => {
  const {slug} = params
  const workshopFiles = await downloadMdxFileOrDirectory(
    context.octokit,
    `workshops/${slug}`,
  )

  const {code, frontmatter} = await compileMdx(slug, workshopFiles)
  return json({slug, code, frontmatter})
}

export function meta({data}: {data: WorkshopPage | null}) {
  return data?.frontmatter.meta
}

export default function MdxScreen() {
  const {code, frontmatter} = useRouteData<WorkshopPage>()
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
