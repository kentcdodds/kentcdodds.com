declare module '*.wasm' {
	const wasmModule: WebAssembly.Module
	export default wasmModule
}

declare module '*?url' {
	const url: string
	export default url
}
