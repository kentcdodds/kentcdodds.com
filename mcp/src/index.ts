import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { z } from 'zod'

export class MyMCP extends McpAgent {
	server = new McpServer(
		{
			name: 'kentcdodds.com',
			version: '1.0.0',
		},
		{
			instructions:
				'You know all about kentcdodds.com. You can search for content from Kent C. Dodds on kentcdodds.com, get the content of a specific blog post by its slug, get the details (title, description, transcript, etc.) for a specific episode of the Chats with Kent podcast by its season number and episode number, and subscribe to Kent C. Dodds newsletter and get regular updates about new articles, courses, and workshops.',
		},
	)

	async init() {
		type SearchResult = {
			title: string
			url: string
			category: string
			metadata?: Record<string, unknown>
		}

		type BlogFile = {
			path: string
			content: string
		}

		type EpisodeDetails = {
			title: string
			description: string
			transcript: string | null
		}

		type NewsletterResponse = {
			message?: string
			error?: string
		}
		this.server.tool(
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
				const params = new URLSearchParams({ query })
				if (category) params.append('category', category)

				const response = await fetch(
					`https://kentcdodds.com/resources/mcp/find-content?${params}`,
				)
				const results = (await response.json()) as SearchResult[]

				if (!results.length) {
					return {
						content: [{ type: 'text', text: `No content found for ${query}` }],
					}
				}

				return {
					content: [
						{
							type: 'text',
							text: results.map((result) => JSON.stringify(result)).join('\n'),
						},
					],
				}
			},
		)

		this.server.tool(
			'get_blog_post',
			'Get the content of a specific blog post by its slug',
			{
				slug: z.string().describe('The slug of the blog post to retrieve'),
			},
			async ({ slug }) => {
				const response = await fetch(
					`https://kentcdodds.com/resources/mcp/blog-post/${slug}`,
				)

				if (!response.ok) {
					return {
						content: [
							{
								type: 'text',
								text: `No blog post found with slug: ${slug}`,
							},
						],
					}
				}

				const files = (await response.json()) as BlogFile[]
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

		this.server.tool(
			'get_chats_with_kent_episode_details',
			'Get the details (title, description, transcript, etc.) for a specific episode of the Chats with Kent podcast by its season number and episode number',
			{
				seasonNumber: z
					.number()
					.describe('The number of the season to retrieve'),
				episodeNumber: z
					.number()
					.describe('The number of the episode to retrieve'),
			},
			async ({ seasonNumber, episodeNumber }) => {
				const response = await fetch(
					`https://kentcdodds.com/resources/mcp/chats-with-kent-episode/${seasonNumber}/${episodeNumber}`,
				)

				if (!response.ok) {
					const error = await response.text()
					return {
						content: [{ type: 'text', text: error }],
					}
				}

				const episode = (await response.json()) as EpisodeDetails
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
							text: episode.transcript
								? `Transcript:\n\n${episode.transcript}`
								: `Transcript: No transcript found for ${episode.title} (Chats with Kent S${seasonNumber}E${episodeNumber})`,
						},
					],
				}
			},
		)

		this.server.tool(
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

				const formData = new FormData()
				formData.append('email', email)
				if (firstName) formData.append('firstName', firstName)

				const response = await fetch(
					'https://kentcdodds.com/resources/mcp/subscribe-to-newsletter',
					{
						method: 'POST',
						body: formData,
					},
				)

				const result = (await response.json()) as NewsletterResponse

				if (!response.ok) {
					return {
						isError: true,
						content: [
							{ type: 'text', text: result.error ?? 'Unknown error occurred' },
						],
					}
				}

				return {
					content: [
						{
							type: 'text',
							text: result.message ?? 'Successfully subscribed to newsletter',
						},
					],
				}
			},
		)
	}
}

// Export the mounted MCP handler
export default MyMCP.mount('/sse')
