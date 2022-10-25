import type {LoaderArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import cachified, {verboseReporter} from 'cachified'
import {cache, shouldForceFresh} from '~/utils/cache.server'

export async function loader({request}: LoaderArgs) {
  const key = 'test-mdx'
  const result = await cachified({
    cache,
    ttl: 1000 * 2,
    reporter: verboseReporter(),
    forceFresh: await shouldForceFresh({
      request,
      key,
    }),
    key,
    checkValue: () => true,
    getFreshValue: getMdx,
  })
  return json(result)
}

async function getMdx() {
  const mdxBundler = await import('mdx-bundler')
  const mdxSource = `
---
title: Example Post
published: 2021-02-13
description: This is some description
---

# Wahoo

import Demo from './demo'

Here's a **neat** demo:

<Demo />
`.trim()

  const result = await mdxBundler.bundleMDX({
    source: mdxSource,
    files: {
      './demo.tsx': `
import * as React from 'react'

function Demo() {
  return <div>Neat demo!</div>
}

export default Demo
    `.trim(),
    },
  })
  return result
}
