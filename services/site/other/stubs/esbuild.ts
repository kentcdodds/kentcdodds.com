export const build = async () => {
	throw new Error('esbuild is not available in the worker dev runtime')
}

export const transform = async () => {
	throw new Error('esbuild is not available in the worker dev runtime')
}

export default { build, transform }
