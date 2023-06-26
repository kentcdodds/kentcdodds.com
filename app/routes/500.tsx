// this is just here to test the error page

import {type LoaderFunction} from '@remix-run/node'
import {useRouteError} from 'react-router-dom'
import {ServerError} from '~/components/errors.tsx'
import {type KCDHandle} from '~/types.ts'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export const loader: LoaderFunction = async () => {
  throw new Error('Oh no!')
}

export default function Screen() {
  return <div>You should not see this</div>
}

export function ErrorBoundary() {
  const error = useRouteError()
  console.error(error)
  return <ServerError />
}
