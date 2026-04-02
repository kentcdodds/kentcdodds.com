const { default: husky } = await import('husky').catch(() => ({ default: null }))

if (!husky) {
	console.log('Skipping Husky install because the dependency is unavailable.')
	process.exit(0)
}

const output = husky()
if (output) {
	console.log(output)
}
