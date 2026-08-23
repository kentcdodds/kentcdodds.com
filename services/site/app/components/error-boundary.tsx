import {
	type ErrorResponse,
	isRouteErrorResponse,
	useParams,
} from 'react-router'
import {
	getErrorMessage,
	getSessionStorageSafely,
	getSpaNavNetworkLocationKey,
	shouldShowSpaNavNetworkReconnecting,
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

	if (
		typeof window !== 'undefined' &&
		shouldShowSpaNavNetworkReconnecting(
			error,
			getSessionStorageSafely(window),
			getSpaNavNetworkLocationKey(window),
		)
	) {
		return (
			<div className="container mx-auto flex items-center justify-center p-4 lg:p-20">
				<p>Reconnecting…</p>
			</div>
		)
	}

	if (typeof document !== 'undefined') {
		console.error(error)
	}

	if (isRouteErrorResponse(error)) {
		const handler = statusHandlers?.[error.status] ?? defaultStatusHandler

		return (
			<div className="container mx-auto flex items-center justify-center p-4 lg:p-20">
				{handler({ error, params })}
			</div>
		)
	}

	return (
		<div className="container mx-auto flex items-center justify-center p-4 lg:p-20">
			{unexpectedErrorHandler(error)}
		</div>
	)
}
