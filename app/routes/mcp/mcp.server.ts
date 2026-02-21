import { AsyncLocalStorage } from 'node:async_hooks'
import { type AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import { addSubscriberToForm } from '#app/kit/kit.server.js'
import { getBlogRecommendations } from '#app/utils/blog.server.js'
import { groupBy } from '#app/utils/cjs/lodash.ts'
import { downloadMdxFilesCached } from '#app/utils/mdx.server.js'
import { getDomainUrl, getErrorMessage, invariant } from '#app/utils/misc.js'
import { prisma } from '#app/utils/prisma.server.js'
import {
	isSemanticSearchConfigured,
	semanticSearchKCD,
} from '#app/utils/semantic-search.server.js'
import { getSeasons as getChatsWithKentSeasons } from '#app/utils/simplecast.server.js'
import { isEmailVerified } from '#app/utils/verifier.server.js'

export const requestStorage = new AsyncLocalStorage<Request>()

type TransportEntry =
	| WebStandardStreamableHTTPServerTransport
	| Promise<WebStandardStreamableHTTPServerTransport>

const transports = new Map<string, TransportEntry>()

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

	server.registerTool(
		'whoami',
		{
			description: 'Get the user ID of the current user',
			inputSchema: {},
		},
		async (_, extra) => {
			const user = await requireUser(extra.authInfo)
			return { content: [{ type: 'text', text: JSON.stringify(user) }] }
		},
	)

	server.registerTool(
		'update_user_info',
		{
			description: 'Update the user info for the current user',
			inputSchema: {
				firstName: z.string().optional().describe('The first name of the user'),
			},
		},
		async ({ firstName }, extra) => {
			const user = await requireUser(extra.authInfo)
			await prisma.user.update({
				where: { id: user.id },
				data: { firstName },
			})
			return { content: [{ type: 'text', text: 'User info updated' }] }
		},
	)

	server.registerTool(
		'get_post_reads',
		{
			description: 'Get the post reads for the current user',
			inputSchema: {},
		},
		async (_, extra) => {
			const request = requireRequest()
			const user = await requireUser(extra.authInfo)
			const postReads = await prisma.postRead.findMany({
				where: { userId: user.id },
				select: {
					postSlug: true,
					createdAt: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
			})
			const domainUrl = getDomainUrl(request)
			const groupedBySlug = groupBy(postReads, 'postSlug')
			const posts = Object.entries(groupedBySlug).map(([postSlug, reads]) => ({
				url: `${domainUrl}/blog/${postSlug}`,
				readCount: reads.length,
				reads: reads.map(({ createdAt }) => createdAt.toISOString()),
			}))

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(posts),
					},
				],
			}
		},
	)

	server.registerTool(
		'get_recommended_posts',
		{
			description: 'Get recommended posts for the current user',
			inputSchema: {},
		},
		async () => {
			const request = requireRequest()
			const domainUrl = getDomainUrl(request)
			const recommendations = await getBlogRecommendations({ request })
			const posts = recommendations.map(
				({
					frontmatter: {
						// remove this because it's not needed and it's kinda big
						bannerBlurDataUrl: _bannerBlurDataUrl,
						...frontmatter
					},
					...recommendation
				}) => ({
					...recommendation,
					url: `${domainUrl}/blog/${recommendation.slug}`,
					frontmatter,
				}),
			)
			return {
				content: [{ type: 'text', text: JSON.stringify(posts) }],
			}
		},
	)

	server.registerTool(
		'get_most_popular_posts',
		{
			description: 'Get the most popular posts on kentcdodds.com',
			inputSchema: {},
		},
		async () => {
			const request = requireRequest()
			const domainUrl = getDomainUrl(request)
			const mostPopularPosts = await prisma.postRead.groupBy({
				by: ['postSlug'],
				_count: true,
				orderBy: {
					_count: {
						postSlug: 'desc',
					},
				},
				take: 10,
			})

			const posts = mostPopularPosts.map(({ postSlug, _count }) => ({
				url: `${domainUrl}/blog/${postSlug}`,
				readCount: _count,
			}))

			return {
				content: [{ type: 'text', text: JSON.stringify(posts) }],
			}
		},
	)

	server.registerTool(
		'find_content',
		{
			description: 'Search for content on kentcdodds.com',
			inputSchema: {
				query: z
					.string()
					.describe(
						`The query to search for. This uses semantic search across indexed content (blog posts, pages, podcasts, talks, resume, credits, and testimonials). Simpler and shorter queries are better.`,
					),
				category: z
					.union([
						z.literal('Blog'),
						z.literal('Chats with Kent Podcast'),
						z.literal('Call Kent Podcast'),
						z.literal('Talks'),
						z.literal('Resume'),
						z.literal('Credits'),
						z.literal('Testimonials'),
					])
					.optional()
					.describe(
						'The category to search in, if omitted, it will search all categories',
					),
			},
		},
		async ({ query, category }) => {
			const request = requestStorage.getStore()
			if (!request) {
				throw new Error('No request found')
			}
			const domainUrl = getDomainUrl(request)

			if (!isSemanticSearchConfigured()) {
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: 'Semantic search is not configured on this environment. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and CLOUDFLARE_VECTORIZE_INDEX.',
						},
					],
				}
			}

			const allowedTypesByCategory: Record<
				NonNullable<typeof category>,
				Array<string>
			> = {
				Blog: ['blog'],
				'Chats with Kent Podcast': ['cwk'],
				'Call Kent Podcast': ['ck'],
				Talks: ['talk'],
				Resume: ['resume'],
				Credits: ['credit'],
				Testimonials: ['testimonial'],
			}

			if (category && allowedTypesByCategory[category].length === 0) {
				return {
					content: [
						{
							type: 'text',
							text: `${category} is not currently included in semantic search.`,
						},
					],
				}
			}

			const results = await semanticSearchKCD({ query, topK: 15 })
			const filteredResults =
				category && allowedTypesByCategory[category].length
					? results.filter((r) =>
							r.type
								? allowedTypesByCategory[category].includes(r.type)
								: false,
						)
					: results

			if (filteredResults.length) {
				return {
					content: [
						{
							type: 'text',
							text: filteredResults
								.map((r) => {
									const url = r.url ?? (r.id.startsWith('/') ? r.id : '')
									const absoluteUrl = url.startsWith('http')
										? url
										: url.startsWith('/')
											? `${domainUrl}${url}`
											: url
												? `${domainUrl}/${url}`
												: domainUrl

									return JSON.stringify({
										title: r.title ?? url ?? r.id,
										url: absoluteUrl,
										category: r.type ?? 'Results',
										summary: r.summary ?? r.snippet ?? null,
										imageUrl: r.imageUrl ?? null,
										imageAlt: r.imageAlt ?? null,
									})
								})
								.join('\n'),
						},
					],
				}
			} else {
				return {
					content: [
						{
							type: 'text',
							text: `No content found for ${category ? `${category}: ` : ''}${query}`,
						},
					],
				}
			}
		},
	)

	server.registerTool(
		'get_blog_post',
		{
			description: 'Get the content of a specific blog post by its slug',
			inputSchema: {
				slug: z.string().describe('The slug of the blog post to retrieve'),
			},
		},
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

	server.registerTool(
		'get_chats_with_kent_episode_details',
		{
			description:
				'Get the details (title, description, transcript, etc.) for a specific episode of the Chats with Kent podcast by its season number and episode number',
			inputSchema: {
				seasonNumber: z
					.number()
					.describe('The number of the season to retrieve'),
				episodeNumber: z
					.number()
					.describe('The number of the episode to retrieve'),
			},
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

	server.registerTool(
		'subscribe_to_newsletter',
		{
			description:
				'Subscribe to Kent C. Dodds newsletter and get regular updates about new articles and courses',
			inputSchema: {
				email: z
					.email()
					.optional()
					.describe(
						'The email address to subscribe (make sure to ask the user for their email address before calling this tool. They will receive a confirmation email if not already subscribed)',
					),
				firstName: z.string().optional().describe('Your first name (optional)'),
			},
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

export async function connect(sessionId?: string | null) {
	if (sessionId) {
		const existingEntry = transports.get(sessionId)
		if (existingEntry) {
			return await existingEntry
		}

		const transportPromise = (async () => {
			let transport: WebStandardStreamableHTTPServerTransport | undefined
			let server: ReturnType<typeof createServer> | undefined
			try {
				transport = new WebStandardStreamableHTTPServerTransport({
					sessionIdGenerator: () => sessionId,
					async onsessioninitialized(initializedSessionId) {
						if (transport) transports.set(initializedSessionId, transport)
					},
					async onsessionclosed(closedSessionId) {
						transports.delete(closedSessionId)
					},
				})

				server = createServer()
				await server.connect(transport)
				return transport
			} catch (error) {
				transports.delete(sessionId)
				// Best-effort cleanup. `server.connect` should have connected the
				// protocol callbacks, so closing the transport is sufficient, but we
				// also close the server to be safe.
				await Promise.allSettled([transport?.close(), server?.close()])
				throw error
			}
		})()
		transports.set(sessionId, transportPromise)
		return await transportPromise
	}

	let transport: WebStandardStreamableHTTPServerTransport | undefined
	let server: ReturnType<typeof createServer> | undefined
	try {
		transport = new WebStandardStreamableHTTPServerTransport({
			sessionIdGenerator: () => crypto.randomUUID(),
			async onsessioninitialized(initializedSessionId) {
				if (transport) transports.set(initializedSessionId, transport)
			},
			async onsessionclosed(closedSessionId) {
				transports.delete(closedSessionId)
			},
		})
		server = createServer()
		await server.connect(transport)
		return transport
	} catch (error) {
		if (transport) {
			// Defensive cleanup in case `onsessioninitialized` ran before the failure.
			for (const [key, entry] of transports.entries()) {
				if (entry === transport) transports.delete(key)
			}
		}
		await Promise.allSettled([transport?.close(), server?.close()])
		throw error
	}
}

function getUserId(authInfo?: AuthInfo): string | null {
	if (authInfo && authInfo.extra && typeof authInfo.extra.userId === 'string') {
		return authInfo.extra.userId
	}
	return null
}

async function getUser(authInfo?: AuthInfo) {
	const userId = getUserId(authInfo)
	if (!userId) return null
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			firstName: true,
			email: true,
			team: true,
			_count: {
				select: { postReads: true },
			},
		},
	})
	if (!user) return null
	return user
}

async function requireUser(authInfo: AuthInfo | undefined) {
	const user = await getUser(authInfo)
	invariant(user, 'User not found')
	return user
}

function requireRequest() {
	const request = requestStorage.getStore()
	invariant(request, 'No request found')
	return request
}
