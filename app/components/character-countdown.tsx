export function CharacterCountdown({
	id,
	value,
	maxLength,
	warnAt = 100,
}: {
	id?: string
	value: string
	maxLength: number
	warnAt?: number
}) {
	const remaining = maxLength - value.length
	const remainingDisplay = Math.max(0, remaining)
	let className = 'text-gray-500 dark:text-slate-400'
	if (remaining <= 0) className = 'text-red-500'
	else if (remaining <= warnAt) className = 'text-yellow-600 dark:text-yellow-500'

	return (
		<p
			id={id}
			className={`mt-2 text-right text-sm tabular-nums ${className}`}
			aria-live="polite"
			aria-atomic="true"
		>
			{remainingDisplay} characters left
		</p>
	)
}
