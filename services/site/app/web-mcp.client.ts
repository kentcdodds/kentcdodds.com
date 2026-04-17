type JsonSchema = {
	type: 'object'
	properties: Record<string, unknown>
	required?: Array<string>
	additionalProperties?: boolean
}

type ToolAnnotations = {
	readOnlyHint?: boolean
}

type ToolResult = Record<string, unknown>

type ToolInput = Record<string, unknown>

type ModelContextClientLike = {
	requestUserInteraction?: <T>(callback: () => Promise<T>) => Promise<T>
}

type ModelContextToolLike = {
	name: string
	title?: string
	description: string
	inputSchema?: JsonSchema
	annotations?: ToolAnnotations
	execute: (
		input: ToolInput,
		client: ModelContextClientLike,
	) => Promise<ToolResult> | ToolResult
}

type ModelContextLike = {
	provideContext?: (context: {
		tools: Array<ModelContextToolLike>
	}) => void | (() => void)
	registerTool?: (
		tool: ModelContextToolLike,
		options?: { signal?: AbortSignal },
	) => void | (() => void)
}

const DEFAULT_SEARCH_RESULT_LIMIT = 5
const SEARCH_RESULT_LIMIT = 8
const PAGE_TEXT_PREVIEW_LENGTH = 1200

const NAVIGATION_DESTINATIONS = {
	about: '/about',
	blog: '/blog',
	calls: '/calls',
	chats: '/chats',
	contact: '/contact',
	courses: '/courses',
	credits: '/credits',
	discord: '/discord',
	home: '/',
	resume: '/resume',
	search: '/search',
	subscribe: '/subscribe',
	talks: '/talks',
	testimonials: '/testimonials',
} as const satisfies Record<string, string>

declare global {
	interface Navigator {
		modelContext?: ModelContextLike
	}

	interface Window {
		__kcdWebMcpCleanup?: (() => void) | undefined
	}
}

export function installSiteWebMcpTools() {
	window.__kcdWebMcpCleanup?.()
	window.__kcdWebMcpCleanup = registerSiteWebMcpTools()
}

export function registerSiteWebMcpTools() {
	const modelContext = navigator.modelContext
	if (!modelContext) return () => {}

	const tools = createSiteTools()
	const abortController = new AbortController()
	const cleanupCallbacks: Array<() => void> = []

	const provideContextCleanup = tryProvideContext(modelContext, tools)
	if (provideContextCleanup) {
		cleanupCallbacks.push(provideContextCleanup)
		return createCleanup(abortController, cleanupCallbacks)
	}

	const registerToolCleanup = tryRegisterTools(
		modelContext,
		tools,
		abortController.signal,
	)
	if (registerToolCleanup) {
		cleanupCallbacks.push(...registerToolCleanup)
		return createCleanup(abortController, cleanupCallbacks)
	}

	return () => {}
}

function createCleanup(
	abortController: AbortController,
	cleanupCallbacks: Array<() => void>,
) {
	let cleanedUp = false

	return () => {
		if (cleanedUp) return
		cleanedUp = true
		abortController.abort()
		for (const cleanup of cleanupCallbacks) cleanup()
	}
}

function tryProvideContext(
	modelContext: ModelContextLike,
	tools: Array<ModelContextToolLike>,
) {
	if (typeof modelContext.provideContext !== 'function') return null

	try {
		const cleanup = modelContext.provideContext({ tools })
		return typeof cleanup === 'function' ? cleanup : () => {}
	} catch (error) {
		console.warn('WebMCP provideContext registration failed', error)
		return null
	}
}

function tryRegisterTools(
	modelContext: ModelContextLike,
	tools: Array<ModelContextToolLike>,
	signal: AbortSignal,
) {
	if (typeof modelContext.registerTool !== 'function') return null

	try {
		const cleanupCallbacks = tools.flatMap((tool) => {
			const cleanup = modelContext.registerTool?.(tool, { signal })
			return typeof cleanup === 'function' ? [cleanup] : []
		})
		return cleanupCallbacks
	} catch (error) {
		console.warn('WebMCP registerTool registration failed', error)
		return null
	}
}

function createSiteTools(): Array<ModelContextToolLike> {
	return [
		{
			name: 'search_site_content',
			title: 'Search site content',
			description:
				'Search Kent C. Dodds site content and return structured results from the site search index.',
			inputSchema: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description:
							'Search query. Short natural-language phrases work best.',
					},
					maxResults: {
						type: 'number',
						description: `Maximum number of results to return (1-${SEARCH_RESULT_LIMIT}).`,
					},
				},
				required: ['query'],
				additionalProperties: false,
			},
			annotations: { readOnlyHint: true },
			async execute(input) {
				return executeSearchSiteContent(asToolInput(input))
			},
		},
		{
			name: 'get_current_page_context',
			title: 'Get current page context',
			description:
				'Return structured context about the current page, including title, canonical URL, headings, and a text preview.',
			inputSchema: {
				type: 'object',
				properties: {},
				additionalProperties: false,
			},
			annotations: { readOnlyHint: true },
			async execute() {
				return getCurrentPageContext()
			},
		},
		{
			name: 'navigate_site',
			title: 'Navigate site',
			description:
				'Navigate to a key section of kentcdodds.com or open the site search page for a query.',
			inputSchema: {
				type: 'object',
				properties: {
					destination: {
						type: 'string',
						enum: Object.keys(NAVIGATION_DESTINATIONS),
						description: 'Named destination on the site.',
					},
					query: {
						type: 'string',
						description:
							'Optional search query used when destination is "search".',
					},
				},
				required: ['destination'],
				additionalProperties: false,
			},
			async execute(input) {
				return navigateSite(asToolInput(input))
			},
		},
	]
}

function asToolInput(input: unknown): ToolInput {
	if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
	return input as ToolInput
}

function clampResultLimit(value: unknown) {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return DEFAULT_SEARCH_RESULT_LIMIT
	}

	return Math.max(1, Math.min(SEARCH_RESULT_LIMIT, Math.floor(value)))
}

function getTrimmedString(input: ToolInput, key: string): string | undefined {
	const value = Reflect.get(input, key)
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	return trimmed ? trimmed : undefined
}

async function executeSearchSiteContent(input: ToolInput) {
	const query = getTrimmedString(input, 'query')
	if (!query) {
		throw new Error('query is required')
	}

	const maxResults = clampResultLimit(Reflect.get(input, 'maxResults'))
	const response = await fetch(
		`/resources/search?query=${encodeURIComponent(query)}`,
		{
			credentials: 'same-origin',
			headers: { accept: 'application/json' },
		},
	)
	if (!response.ok) {
		let payload:
			| {
					error?: string
					noCloseMatches?: boolean
					results?: Array<Record<string, unknown>>
			  }
			| undefined

		try {
			payload = (await response.json()) as
				| {
						error?: string
						noCloseMatches?: boolean
						results?: Array<Record<string, unknown>>
				  }
				| undefined
		} catch (error) {
			console.warn('Search response was not JSON', error)
		}

		throw new Error(
			payload?.error ?? `Search request failed (${response.status})`,
		)
	}

	const payload = (await response.json()) as
		| {
				error?: string
				noCloseMatches?: boolean
				results?: Array<Record<string, unknown>>
		  }
		| undefined

	const results = Array.isArray(payload?.results)
		? payload.results.slice(0, maxResults)
		: []

	return {
		query,
		noCloseMatches: Boolean(payload?.noCloseMatches),
		resultCount: results.length,
		results,
	}
}

function getCurrentPageContext() {
	const main = document.querySelector('main')
	const mainText =
		main instanceof HTMLElement ? main.innerText : document.body.innerText
	const headingElements = document.querySelectorAll('main h1, main h2, main h3')
	const headings = Array.from(headingElements)
		.map((heading) => heading.textContent?.trim())
		.filter((value): value is string => Boolean(value))
		.slice(0, 12)

	return {
		title: document.title,
		url: window.location.href,
		path: window.location.pathname,
		description: getPageDescription(),
		headings,
		textPreview: truncateText(mainText, PAGE_TEXT_PREVIEW_LENGTH),
	}
}

function getPageDescription() {
	const metaDescription = document.querySelector('meta[name="description"]')
	if (metaDescription instanceof HTMLMetaElement && metaDescription.content) {
		return metaDescription.content
	}

	const ogDescription = document.querySelector(
		'meta[property="og:description"]',
	)
	if (ogDescription instanceof HTMLMetaElement && ogDescription.content) {
		return ogDescription.content
	}

	return null
}

function truncateText(value: string, maxLength: number) {
	const normalized = value.replace(/\s+/g, ' ').trim()
	if (normalized.length <= maxLength) return normalized
	return `${normalized.slice(0, maxLength - 3)}...`
}

async function navigateSite(input: ToolInput) {
	const destinationKey = getTrimmedString(input, 'destination')
	if (!destinationKey) {
		throw new Error('destination is required')
	}

	if (!Object.hasOwn(NAVIGATION_DESTINATIONS, destinationKey)) {
		throw new Error(`Unknown destination: ${destinationKey}`)
	}

	const destination =
		NAVIGATION_DESTINATIONS[
			destinationKey as keyof typeof NAVIGATION_DESTINATIONS
		]
	const url = new URL(destination, window.location.origin)
	if (destinationKey === 'search') {
		const query = getTrimmedString(input, 'query')
		if (query) url.searchParams.set('q', query)
	}

	window.location.assign(url.toString())

	return {
		destination: destinationKey,
		url: url.toString(),
	}
}
