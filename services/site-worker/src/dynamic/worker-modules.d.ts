declare module 'site-content-data.json' {
	const contentData: unknown
	export default contentData
}

declare module 'mdx/*' {
	const mod: { default: import('react').ComponentType<Record<string, unknown>> }
	export default mod.default
}

declare module '*.txt' {
	const content: string
	export default content
}
