const PORT = Number(process.env.PORT || 3000)
const baseUrl = `http://localhost:${PORT}`

async function warmupPath(path: string) {
	// The first requests can race the MDX sidecar's initial compile; retry
	// until the stack is actually ready instead of failing the whole run.
	const startedAt = Date.now()
	const deadline = Date.now() + 4 * 60_000
	let attempts = 0
	for (;;) {
		attempts++
		try {
			const response = await fetch(`${baseUrl}${path}`, {
				headers: { Accept: 'text/html' },
				signal: AbortSignal.timeout(120_000),
			})
			if (response.ok) {
				await response.arrayBuffer()
				console.info(
					`playwright global setup: warmed ${path} in ${Date.now() - startedAt}ms after ${attempts} attempt(s)`,
				)
				return
			}
			if (Date.now() > deadline) {
				throw new Error(`Warmup request failed for ${path}: ${response.status}`)
			}
		} catch (error) {
			if (Date.now() > deadline) throw error
		}
		await new Promise((resolve) => setTimeout(resolve, 5_000))
	}
}

export default async function globalSetup() {
	if (!process.env.CI) return
	await warmupPath('/')
	await warmupPath('/contact')
}
