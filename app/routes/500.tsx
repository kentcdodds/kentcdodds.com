// this is just here to test the error page

import type {LoaderFunction} from '@remix-run/node'
import type {KCDHandle} from '~/types'
import {ServerError} from '~/components/errors'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export const loader: LoaderFunction = async () => {
  throw new Error('Oh no!')
}

export default function Screen() {
  return <div>You should not see this</div>
}

export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)
  return <ServerError />
}
