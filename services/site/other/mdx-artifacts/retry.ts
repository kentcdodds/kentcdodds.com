export async function withRetry<T>({
	fn,
	attempts = 3,
	delayMs = 500,
	label,
}: {
	fn: () => Promise<T>
	attempts?: number
	delayMs?: number
	label?: string
}): Promise<T> {
	let lastError: unknown
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			return await fn()
		} catch (error: unknown) {
			lastError = error
			if (attempt === attempts) break
			const waitMs = delayMs * attempt
			console.warn(
				`${label ? `${label}: ` : ''}attempt ${attempt}/${attempts} failed, retrying in ${waitMs}ms`,
				error,
			)
			await new Promise((resolve) => setTimeout(resolve, waitMs))
		}
	}
	throw lastError
}
