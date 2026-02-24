// This is called a "splat route" and as it's in the root `/app/routes/`
// directory, it's a catchall. If no other routes match, this one will and we
// can know that the user is hitting a URL that doesn't exist. By throwing a
// 404 from the loader, we can force the error boundary to render which will
// ensure the user gets the right status code and we can display a nicer error
// message for them than the Remix and/or browser default.

import { data as json } from 'react-router'
import { ArrowLink } from '#app/components/arrow-button.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorPage, FourOhFour } from '#app/components/errors.tsx'
import { Facepalm } from '#app/components/kifs.tsx'
import { type NotFoundMatch } from '#app/utils/not-found-matches.ts'
import { getNotFoundSuggestions } from '#app/utils/not-found-suggestions.server.ts'

export async function loader({ request }: { request: Request }) {
	const accept = request.headers.get('accept') ?? ''
	const wantsHtml =
		accept.includes('text/html') || accept.includes('application/xhtml+xml')
	if (!wantsHtml || request.method.toUpperCase() !== 'GET') {
		throw new Response('Not found', { status: 404 })
	}

	const pathname = new URL(request.url).pathname
	const suggestions = await getNotFoundSuggestions({ request, pathname, limit: 8 })

	const data: {
		possibleMatches?: Array<NotFoundMatch>
		possibleMatchesQuery?: string
	} = {}
	if (suggestions) {
		data.possibleMatches = suggestions.matches
		data.possibleMatchesQuery = suggestions.query
	}

	throw json(data, {
		status: 404,
		headers: {
			'Cache-Control': 'private, max-age=60',
		},
	})
}

export default function NotFound() {
	// due to the loader, this component will never be rendered, but we'll return
	// the error boundary just in case.
	return <ErrorBoundary />
}

export function ErrorBoundary() {
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
				404: ({ error }) => (
					<FourOhFour
						possibleMatches={error.data.possibleMatches}
						possibleMatchesQuery={error.data.possibleMatchesQuery}
					/>
				),
			}}
		/>
	)
}
