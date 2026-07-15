export function CallKentProcessingWarning({
	message,
}: {
	message?: string | null
}) {
	if (!message) return null

	return (
		<div
			role="alert"
			className="mt-3 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
		>
			<span className="font-semibold">Processing warning: </span>
			<span className="whitespace-pre-wrap">{message}</span>
		</div>
	)
}
