import { type ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { type KCDHandle } from '#app/types.ts'
import { useCapturedRouteError } from '#app/utils/misc.tsx'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export async function loader() {
	return json({})
}

export async function action({ request }: ActionFunctionArgs) {
	return redirect(new URL(request.url).pathname)
}

// TODO: make this a thing...
export default function GuestInfo() {
	const data = useLoaderData<typeof loader>()
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
