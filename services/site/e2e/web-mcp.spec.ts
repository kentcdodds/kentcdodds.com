import { type Page, expect, test } from '@playwright/test'

type RegisteredTool = {
	name: string
	description: string
	inputSchema?: Record<string, unknown>
	annotations?: { readOnlyHint?: boolean }
	execute: (input?: Record<string, unknown>) => Promise<unknown> | unknown
}

async function installProvideContextShim(page: Page) {
	await page.addInitScript(() => {
		type RegisteredTool = {
			name: string
			description: string
			inputSchema?: Record<string, unknown>
			annotations?: { readOnlyHint?: boolean }
			execute: (input?: Record<string, unknown>) => Promise<unknown> | unknown
		}

		const state = {
			provideContextCalls: 0,
			tools: [] as Array<RegisteredTool>,
		}

		Object.defineProperty(navigator, 'modelContext', {
			configurable: true,
			value: {
				provideContext(context: { tools?: Array<RegisteredTool> }) {
					state.provideContextCalls += 1
					state.tools = [...(context.tools ?? [])]
					return () => {
						state.tools = []
					}
				},
			},
		})

		Object.defineProperty(window, '__webMcpTestState', {
			configurable: true,
			value: state,
		})
	})
}

async function installRegisterToolShim(page: Page) {
	await page.addInitScript(() => {
		type RegisteredTool = {
			name: string
			description: string
			inputSchema?: Record<string, unknown>
			annotations?: { readOnlyHint?: boolean }
			execute: (input?: Record<string, unknown>) => Promise<unknown> | unknown
		}

		const state = {
			registerToolCalls: 0,
			tools: [] as Array<RegisteredTool>,
		}

		Object.defineProperty(navigator, 'modelContext', {
			configurable: true,
			value: {
				registerTool(tool: RegisteredTool, options?: { signal?: AbortSignal }) {
					state.registerToolCalls += 1
					state.tools.push(tool)
					options?.signal?.addEventListener('abort', () => {
						state.tools = state.tools.filter(
							(entry) => entry.name !== tool.name,
						)
					})
					return () => {
						state.tools = state.tools.filter(
							(entry) => entry.name !== tool.name,
						)
					}
				},
			},
		})

		Object.defineProperty(window, '__webMcpTestState', {
			configurable: true,
			value: state,
		})
	})
}

async function readProvideContextState(page: Page) {
	return page.evaluate(() => {
		const state = (
			window as unknown as {
				__webMcpTestState: {
					provideContextCalls: number
					tools: Array<RegisteredTool>
				}
			}
		).__webMcpTestState

		return {
			provideContextCalls: state.provideContextCalls,
			names: state.tools.map((tool) => tool.name),
			searchToolSchema: state.tools.find(
				(tool) => tool.name === 'search_site_content',
			)?.inputSchema,
		}
	})
}

async function readRegisterToolState(page: Page) {
	return page.evaluate(async () => {
		const state = (
			window as unknown as {
				__webMcpTestState: {
					registerToolCalls: number
					tools: Array<RegisteredTool>
				}
			}
		).__webMcpTestState

		const searchTool = state.tools.find(
			(tool) => tool.name === 'search_site_content',
		)
		const pageTool = state.tools.find(
			(tool) => tool.name === 'get_current_page_context',
		)
		if (!searchTool || !pageTool) {
			return {
				registerToolCalls: state.registerToolCalls,
				toolNames: state.tools.map((tool) => tool.name),
				searchResult: null,
				pageResult: null,
			}
		}

		const searchResult = (await searchTool.execute({
			query: 'authentication',
			maxResults: 2,
		})) as {
			resultCount: number
			results: Array<{ title?: string; url?: string }>
		}
		const pageResult = (await pageTool.execute({})) as {
			title: string
			path: string
			headings: Array<string>
			textPreview: string
		}

		return {
			registerToolCalls: state.registerToolCalls,
			toolNames: state.tools.map((tool) => tool.name),
			searchResult,
			pageResult,
		}
	})
}

async function installThrowingCleanupState(page: Page) {
	await page.addInitScript(() => {
		Object.defineProperty(window, '__kcdWebMcpCleanup', {
			configurable: true,
			writable: true,
			value: () => {
				throw new Error('previous cleanup failed')
			},
		})
	})
}

test('registers WebMCP tools on page load with provideContext', async ({
	page,
}) => {
	await installProvideContextShim(page)
	await page.goto('/')
	await expect(page.getByRole('navigation')).toBeVisible()

	await expect
		.poll(() => readProvideContextState(page))
		.toMatchObject({
			provideContextCalls: 1,
			names: [
				'search_site_content',
				'get_current_page_context',
				'navigate_site',
			],
		})

	const toolSummary = await readProvideContextState(page)

	expect(toolSummary.provideContextCalls).toBe(1)
	expect(toolSummary.names).toEqual([
		'search_site_content',
		'get_current_page_context',
		'navigate_site',
	])
	expect(toolSummary.searchToolSchema).toMatchObject({
		type: 'object',
		required: ['query'],
		additionalProperties: false,
	})
})

test('falls back to registerTool and executes WebMCP tools', async ({
	page,
}) => {
	await installRegisterToolShim(page)
	await page.goto('/')
	await expect(page.getByRole('navigation')).toBeVisible()

	await expect
		.poll(() => readRegisterToolState(page))
		.toMatchObject({
			registerToolCalls: 3,
			toolNames: [
				'search_site_content',
				'get_current_page_context',
				'navigate_site',
			],
		})

	const toolSummary = await readRegisterToolState(page)

	expect(toolSummary.registerToolCalls).toBe(3)
	expect(toolSummary.toolNames).toEqual([
		'search_site_content',
		'get_current_page_context',
		'navigate_site',
	])
	expect(toolSummary.searchResult?.resultCount).toBeGreaterThan(0)
	expect(toolSummary.searchResult?.results[0]?.url).toContain('/calls/1/1')
	expect(toolSummary.pageResult?.path).toBe('/')
	expect(toolSummary.pageResult?.title).toContain('Kent C. Dodds')
	expect(toolSummary.pageResult?.headings.length).toBeGreaterThan(0)
	expect(toolSummary.pageResult?.textPreview.length).toBeGreaterThan(0)
})

test('reinstalls WebMCP tools even if the previous cleanup throws', async ({
	page,
}) => {
	await installProvideContextShim(page)
	await installThrowingCleanupState(page)
	await page.goto('/')
	await expect(page.getByRole('navigation')).toBeVisible()

	await expect
		.poll(() => readProvideContextState(page))
		.toMatchObject({
			provideContextCalls: 1,
			names: [
				'search_site_content',
				'get_current_page_context',
				'navigate_site',
			],
		})

	const cleanupReplaced = await page.evaluate(
		() =>
			typeof (window as Window).__kcdWebMcpCleanup === 'function' &&
			(window as Window).__kcdWebMcpCleanup
				?.toString()
				.includes('cleanedUp') === true,
	)
	expect(cleanupReplaced).toBe(true)
})

test('navigate_site asks for confirmation without requestUserInteraction', async ({
	page,
}) => {
	await installRegisterToolShim(page)
	await page.goto('/')
	await expect(page.getByRole('navigation')).toBeVisible()

	await expect
		.poll(() => readRegisterToolState(page))
		.toMatchObject({
			registerToolCalls: 3,
			toolNames: [
				'search_site_content',
				'get_current_page_context',
				'navigate_site',
			],
		})

	const outcome = await page.evaluate(async () => {
		const state = (
			window as unknown as {
				__webMcpTestState: {
					tools: Array<RegisteredTool>
				}
			}
		).__webMcpTestState
		const navigateTool = state.tools.find(
			(tool) => tool.name === 'navigate_site',
		)
		if (!navigateTool) throw new Error('Expected navigate_site tool')

		const confirmCalls: Array<string> = []
		const originalConfirm = window.confirm
		window.confirm = (message?: string) => {
			confirmCalls.push(message ?? '')
			return false
		}

		try {
			const result = (await navigateTool.execute({
				destination: 'blog',
			})) as {
				cancelled?: boolean
				destination?: string
				url?: string
			}

			return {
				result,
				confirmCalls,
				locationHref: window.location.href,
			}
		} finally {
			window.confirm = originalConfirm
		}
	})

	expect(outcome.confirmCalls).toEqual([
		'Allow navigation to http://localhost:3000/blog?',
	])
	expect(outcome.result).toMatchObject({
		cancelled: true,
		destination: 'blog',
		url: 'http://localhost:3000/blog',
	})
	expect(outcome.locationHref).toBe('http://localhost:3000/')
})
