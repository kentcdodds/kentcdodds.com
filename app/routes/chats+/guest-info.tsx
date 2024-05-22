import {
	json,
	redirect,
	type ActionFunction,
	type LoaderFunction,
} from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { type KCDHandle } from '~/types.ts'
import { useCapturedRouteError } from '~/utils/misc.tsx'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

type LoaderData = {}

export const loader: LoaderFunction = async () => {
	const data: LoaderData = {}
	return json(data)
}

export const action: ActionFunction = async ({ request }) => {
	return redirect(new URL(request.url).pathname)
}

// TODO: make this a thing...
export default function GuestInfo() {
	const data = useLoaderData<LoaderData>()
	return (
		<div>
			{`TODO: make this a thing...`}
			<pre>{JSON.stringify(data, null, 2)}</pre>
			<Form method="POST" noValidate>
				<button type="submit">submit</button>
			</Form>
		</div>
	)
}

export function ErrorBoundary() {
	const error = useCapturedRouteError()
	console.error(error)
	if (error instanceof Error) {
		return (
			<div>
				<h2>Error</h2>
				<pre>{error.stack}</pre>
			</div>
		)
	} else {
		return <h2>Unknown Error</h2>
	}
}
