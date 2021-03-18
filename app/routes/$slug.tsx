import React from 'react'
import type {RequestError} from '@octokit/types'
import {json} from '@remix-run/data'
import {useRouteData} from '@remix-run/react'
import {getMDXComponent} from 'mdx-bundler/client'
import type {MdxPage, KCDLoader} from 'types'
import {AnchorOrLink} from '../shared'
import {getMdx} from '../utils/mdx.server'

export const loader: KCDLoader<{slug: string}> = async ({params, context}) => {
  try {
    const mdxPage = await getMdx(params.slug, context.octokit)
    return json(mdxPage)
  } catch (error: unknown) {
    if ('request' in (error as Object)) {
      // RequestError doesn't have "headers" but it actually does so...
      const requestError = error as RequestError & {
        headers: Record<string, string>
      }
      const {documentation_url, errors, name, status, headers} = requestError
      return new Response(
        JSON.stringify({name, status, documentation_url, errors}),
        {status, headers},
      )
    }
    throw error
  }
}

export function meta({data}: {data: MdxPage | RequestError | null}) {
  if (!data) {
    return {
      title: 'Unknown error',
      description: 'Something went wrong with this page',
    }
  }
  if ('status' in data) {
    return {
      title: `${data.name} – ${data.status}`,
      description: 'There was an error loading this page.',
    }
  }
  if ('frontmatter' in data) {
    return {
      title: data.frontmatter.title,
      description: data.frontmatter.description,
    }
  }
  return {}
}

export default function MdxScreen() {
  const {code, frontmatter} = useRouteData<MdxPage>()
  const Component = React.useMemo(() => getMDXComponent(code), [code])

  return (
    <>
      <header>
        <h1>{frontmatter.title}</h1>
        <p>{frontmatter.description}</p>
      </header>
      <main>
        <Component components={{a: AnchorOrLink}} />
      </main>
    </>
  )
}

export function ErrorBoundary({error}: {error: Error}) {
  return (
    <div>
      Oh no
      <pre>{error.message}</pre>
    </div>
  )
}

/*
eslint
  no-void: "off",
*/
