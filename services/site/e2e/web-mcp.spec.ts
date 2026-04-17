import { expect, test } from '@playwright/test'

type RegisteredTool = {
	name: string
	description: string
	inputSchema?: Record<string, unknown>
	annotations?: { readOnlyHint?: boolean }
	execute: (input?: Record<string, unknown>) => Promise<unknown> | unknown
}

async function installProvideContextShim(
	page: Parameters<typeof test>[0]['page'],
) {
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

async function installRegisterToolShim(
	page: Parameters<typeof test>[0]['page'],
) {
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

test('registers WebMCP tools on page load with provideContext', async ({
	page,
}) => {
	await installProvideContextShim(page)
	await page.goto('/')
	await expect(page.getByRole('navigation')).toBeVisible()

	const toolSummary = await page.evaluate(() => {
		const state = (
			window as Window & {
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

	const toolSummary = await page.evaluate(async () => {
		const state = (
			window as Window & {
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
			throw new Error('Expected WebMCP tools to be registered')
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

	expect(toolSummary.registerToolCalls).toBe(3)
	expect(toolSummary.toolNames).toEqual([
		'search_site_content',
		'get_current_page_context',
		'navigate_site',
	])
	expect(toolSummary.searchResult.resultCount).toBeGreaterThan(0)
	expect(toolSummary.searchResult.results[0]?.url).toContain('/calls/1/1')
	expect(toolSummary.pageResult.path).toBe('/')
	expect(toolSummary.pageResult.title).toContain('Kent C. Dodds')
	expect(toolSummary.pageResult.headings.length).toBeGreaterThan(0)
	expect(toolSummary.pageResult.textPreview.length).toBeGreaterThan(0)
})
