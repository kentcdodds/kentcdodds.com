const PORT = Number(process.env.PORT || 3000)
const baseUrl = `http://localhost:${PORT}`

async function warmupPath(path: string) {
	const response = await fetch(`${baseUrl}${path}`, {
		headers: { Accept: 'text/html' },
		signal: AbortSignal.timeout(120_000),
	})
	if (!response.ok) {
		throw new Error(`Warmup request failed for ${path}: ${response.status}`)
	}
	await response.arrayBuffer()
}

export default async function globalSetup() {
	if (!process.env.CI) return
	await warmupPath('/')
	await warmupPath('/contact')
}
