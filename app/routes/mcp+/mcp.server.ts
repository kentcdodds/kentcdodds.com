import { AsyncLocalStorage } from 'node:async_hooks'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { addSubscriberToForm } from '#app/kit/kit.server.js'
import { cache, cachified } from '#app/utils/cache.server.js'
import {
	ensureInstance,
	getInstanceInfo,
} from '#app/utils/cjs/litefs-js.server.js'
import { downloadMdxFilesCached } from '#app/utils/mdx.server.js'
import { getDomainUrl, getErrorMessage } from '#app/utils/misc.js'
import { searchKCD } from '#app/utils/search.server.js'
import { getSeasons as getChatsWithKentSeasons } from '#app/utils/simplecast.server.js'
import { isEmailVerified } from '#app/utils/verifier.server.js'
import { FetchSSEServerTransport } from './fetch-transport.server'

export const requestStorage = new AsyncLocalStorage<Request>()

const transports = new Map<string, FetchSSEServerTransport>()

function createServer() {
	const server = new McpServer(
		{
			name: 'kentcdodds.com',
			version: '1.0.0',
		},
		{
			capabilities: {
				tools: {},
			},
		},
	)

	server.tool(
		'find_content',
		'Search for content on kentcdodds.com',
		{
			query: z
				.string()
				.describe(
					`The query to search for. It's not very intelligent, it uses match-sorter to find text matches in titles, descriptions, categories, tags, etc. Simpler and shorter queries are better.`,
				),
			category: z
				.union([
					z.literal('Blog'),
					z.literal('Chats with Kent Podcast'),
					z.literal('Call Kent Podcast'),
					z.literal('Workshops'),
					z.literal('Talks'),
				])
				.optional()
				.describe(
					'The category to search in, if omitted, it will search all categories',
				),
		},
		async ({ query, category }) => {
			const request = requestStorage.getStore()
			if (!request) {
				throw new Error('No request found')
			}
			const domainUrl = getDomainUrl(request)

			const categoryMap: Record<NonNullable<typeof category>, string> = {
				Blog: 'b',
				'Chats with Kent Podcast': 'cwk',
				'Call Kent Podcast': 'ckp',
				Workshops: 'w',
				Talks: 't',
			}

			const searchResults = await searchKCD({
				request,
				query: category ? `${categoryMap[category]}:${query}` : query,
			})

			if (searchResults.length) {
				return {
					content: [
						{
							type: 'text',
							text: searchResults
								.map(({ title, route, segment, metadata }) =>
									JSON.stringify({
										title,
										url: `${domainUrl}${route}`,
										category: segment,
										...metadata,
									}),
								)
								.join('\n'),
						},
					],
				}
			} else {
				return {
					content: [{ type: 'text', text: `No content found for ${query}` }],
				}
			}
		},
	)

	server.tool(
		'get_blog_post',
		'Get the content of a specific blog post by its slug',
		{ slug: z.string().describe('The slug of the blog post to retrieve') },
		async ({ slug }) => {
			const { files } = await downloadMdxFilesCached('blog', slug, {})

			if (!files.length) {
				return {
					content: [
						{ type: 'text', text: `No blog post found with slug: ${slug}` },
					],
				}
			}

			return {
				content: files.map(
					(file) =>
						({
							type: 'text',
							text: `${file.path}:\n\n${file.content}`,
						}) as const,
				),
			}
		},
	)

	server.tool(
		'get_chats_with_kent_episode_details',
		'Get the details (title, description, transcript, etc.) for a specific episode of the Chats with Kent podcast by its season number and episode number',
		{
			seasonNumber: z.number().describe('The number of the season to retrieve'),
			episodeNumber: z
				.number()
				.describe('The number of the episode to retrieve'),
		},
		async ({ episodeNumber, seasonNumber }) => {
			const request = requestStorage.getStore()
			if (!request) {
				throw new Error('No request found')
			}
			const seasons = await getChatsWithKentSeasons({ request })
			const season = seasons.find((s) => s.seasonNumber === seasonNumber)
			if (!season) {
				throw new Response(`Season ${seasonNumber} not found`, { status: 404 })
			}
			const episode = season.episodes.find(
				(e) => e.episodeNumber === episodeNumber,
			)
			if (!episode) {
				throw new Response(`Episode ${episodeNumber} not found`, {
					status: 404,
				})
			}

			return {
				content: [
					{
						type: 'text',
						text: `Title: ${episode.title}\n`,
					},
					{
						type: 'text',
						text: `Description:\n${episode.description}\n`,
					},
					{
						type: 'text',
						text:
							`Transcript:\n\n${episode.transcriptHTML}` ||
							`Transcript: No transcript found for ${episode.title} (Chats with Kent S${seasonNumber}E${episodeNumber})`,
					},
				],
			}
		},
	)

	server.tool(
		'subscribe_to_newsletter',
		'Subscribe to Kent C. Dodds newsletter and get regular updates about new articles, courses, and workshops',
		{
			email: z
				.string()
				.email()
				.optional()
				.describe(
					'The email address to subscribe (make sure to ask the user for their email address before calling this tool. They will receive a confirmation email if not already subscribed)',
				),
			firstName: z.string().optional().describe('Your first name (optional)'),
		},
		async ({ email, firstName }) => {
			if (!email) {
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `No email address provided. Please provide the user's email address before calling this tool.`,
						},
					],
				}
			}

			const isVerified = await isEmailVerified(email)
			if (!isVerified.verified) {
				return {
					isError: true,
					content: [{ type: 'text', text: isVerified.message }],
				}
			}

			try {
				await addSubscriberToForm({
					email,
					firstName: firstName ?? '',
					kitFormId: '827139',
				})

				return {
					content: [
						{
							type: 'text',
							text: `Successfully subscribed ${email} to Kent's newsletter! If you're not already on Kent's mailing list, you'll receive a confirmation email.`,
						},
					],
				}
			} catch (error) {
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `Failed to subscribe to the newsletter: ${getErrorMessage(error)}`,
						},
					],
				}
			}
		},
	)
	return server
}

const server = createServer()

export async function connect(sessionId?: string | null) {
	const { currentInstance } = await getInstanceInfo()
	const transport = new FetchSSEServerTransport('/mcp', sessionId)
	transport.onclose = () => {
		transports.delete(transport.sessionId)
	}
	await server.connect(transport)
	transports.set(transport.sessionId, transport)

	// we're cheating to get this sessionId into the cache so it's accessible in
	// every instance.
	await cachified({
		key: `mcp-${transport.sessionId}`,
		cache,
		ttl: 60 * 60 * 24 * 30,
		getFreshValue() {
			return {
				sessionId: transport.sessionId,
				instance: currentInstance,
			}
		},
	})
	return transport
}

export async function getTransport(sessionId: string) {
	const { instance } = await cachified({
		key: `mcp-${sessionId}`,
		cache,
		getFreshValue() {
			throw new Error(`Instance for sessionId "${sessionId}" not found`)
		},
	})
	ensureInstance(instance)

	return transports.get(sessionId)
}
