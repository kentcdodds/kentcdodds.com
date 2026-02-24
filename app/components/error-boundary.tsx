import {
	type ErrorResponse,
	isRouteErrorResponse,
	useParams,
} from 'react-router'
import {
	getErrorMessage,
	useCapturedRouteError,
} from '#app/utils/misc-react.tsx'

type StatusHandler = (info: {
	error: ErrorResponse
	params: Record<string, string | undefined>
}) => React.ReactNode | null

export function GeneralErrorBoundary({
	defaultStatusHandler = ({ error }) => (
		<p>
			{error.status} {error.data}
		</p>
	),
	statusHandlers,
	unexpectedErrorHandler = (error) => <p>{getErrorMessage(error)}</p>,
}: {
	defaultStatusHandler?: StatusHandler
	statusHandlers?: Record<number, StatusHandler>
	unexpectedErrorHandler?: (error: unknown) => React.ReactNode | null
}) {
	const error = useCapturedRouteError()
	const params = useParams()

	if (typeof document !== 'undefined') {
		console.error(error)
	}

	// Most of our route-specific status handlers render full-page experiences
	// (like the 404 hero). Wrapping those in a padded container makes mobile
	// layouts extremely narrow, so only wrap the fallback/simple handlers.
	if (isRouteErrorResponse(error)) {
		const statusHandler = statusHandlers?.[error.status]
		const content = (statusHandler ?? defaultStatusHandler)({ error, params })
		if (statusHandler) return <>{content}</>
		return (
			<div className="text-h2 container mx-auto flex items-center justify-center p-6 sm:p-12 lg:p-20">
				{content}
			</div>
		)
	}

	return (
		<div className="text-h2 container mx-auto flex items-center justify-center p-6 sm:p-12 lg:p-20">
			{unexpectedErrorHandler(error)}
		</div>
	)
}
