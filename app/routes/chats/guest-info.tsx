import type {ActionFunction, LoaderFunction} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Form, useLoaderData} from '@remix-run/react'
import type {KCDHandle} from '~/types'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

type LoaderData = {}

export const loader: LoaderFunction = async () => {
  const data: LoaderData = {}
  return json(data)
}

export const action: ActionFunction = async ({request}) => {
  return redirect(new URL(request.url).pathname)
}

// TODO: make this a thing...
export default function GuestInfo() {
  const data = useLoaderData<LoaderData>()
  return (
    <div>
      {`TODO: make this a thing...`}
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <Form method="post" noValidate>
        <button type="submit">submit</button>
      </Form>
    </div>
  )
}

export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)
  return (
    <div>
      <h1>Error</h1>
      <pre>{error.stack}</pre>
    </div>
  )
}
