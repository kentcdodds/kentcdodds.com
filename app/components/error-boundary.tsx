import {
	type ErrorResponse,
	isRouteErrorResponse,
	useParams,
} from 'react-router'
import { clsx } from 'clsx'
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

	const routeError = isRouteErrorResponse(error) ? error : null
	const isNotFound = routeError?.status === 404

	return (
		<div
			className={clsx('text-h2', {
				// The 404 UI renders a full page layout (hero, matches, etc). Wrapping it
				// in a centered container + huge padding makes mobile feel extremely narrow.
				'p-4': isNotFound,
				'container mx-auto flex items-center justify-center p-20': !isNotFound,
			})}
		>
			{routeError
				? (statusHandlers?.[routeError.status] ?? defaultStatusHandler)({
						error: routeError,
						params,
					})
				: unexpectedErrorHandler(error)}
		</div>
	)
}
