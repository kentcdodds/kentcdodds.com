// This is called a "splat route" and as it's in the root `/app/routes/`
// directory, it's a catchall. If no other routes match, this one will and we
// can know that the user is hitting a URL that doesn't exist. By throwing a
// 404 from the loader, we can force the error boundary to render which will
// ensure the user gets the right status code and we can display a nicer error
// message for them than the Remix and/or browser default.

import { useLocation } from '@remix-run/react'
import { ArrowLink } from '~/components/arrow-button.tsx'
import { GeneralErrorBoundary } from '~/components/error-boundary.tsx'
import { ErrorPage } from '~/components/errors.tsx'
import { Facepalm, MissingSomething } from '~/components/kifs.tsx'

export async function loader() {
	throw new Response('Not found', { status: 404 })
}

export default function NotFound() {
	// due to the loader, this component will never be rendered, but we'll return
	// the error boundary just in case.
	return <ErrorBoundary />
}

export function ErrorBoundary() {
	const location = useLocation()
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				400: () => (
					<ErrorPage
						heroProps={{
							title: '400 - Oh no, you did something wrong.',
							subtitle: `If you think I did something wrong, let me know...`,
							image: <Facepalm className="rounded-lg" aspectRatio="3:4" />,
							action: <ArrowLink href="/">Go home</ArrowLink>,
						}}
					/>
				),
				404: () => (
					<ErrorPage
						heroProps={{
							title: "404 - Oh no, you found a page that's missing stuff.",
							subtitle: `"${location.pathname}" is not a page on kentcdodds.com. So sorry.`,
							image: (
								<MissingSomething className="rounded-lg" aspectRatio="3:4" />
							),
							action: <ArrowLink href="/">Go home</ArrowLink>,
						}}
					/>
				),
			}}
		/>
	)
}
