import { z } from 'zod'

const simplecastCollectionResponseSchema = <ItemSchema extends z.ZodTypeAny>(
	itemSchema: ItemSchema,
) =>
	z.object({
		collection: z.array(itemSchema),
	})

// --- /podcasts/:podcastId/seasons ---
export const simplecastSeasonListItemSchema = z.object({
	href: z.string().min(1),
	number: z.number(),
})

export const simplecastSeasonsResponseSchema = simplecastCollectionResponseSchema(
	simplecastSeasonListItemSchema,
)

export type SimplecastSeasonListItem = z.infer<typeof simplecastSeasonListItemSchema>

// --- /seasons/:seasonId/episodes ---
export const simplecastEpisodeListItemSchema = z.object({
	id: z.string().min(1),
	status: z.string().min(1),
	is_hidden: z.boolean(),
})

export const simplecastEpisodesListResponseSchema =
	simplecastCollectionResponseSchema(simplecastEpisodeListItemSchema)

export type SimplecastEpisodeListItem = z.infer<typeof simplecastEpisodeListItemSchema>

// --- /episodes/:episodeId ---
export const simplecastEpisodeSchema = z.object({
	id: z.string().min(1),
	is_published: z.boolean(),
	published_at: z.string().min(1).nullable().optional(),
	updated_at: z.string().min(1),
	slug: z.string().min(1),
	transcription: z.string().nullable().optional(),
	long_description: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	image_url: z.string().min(1),
	number: z.number(),
	duration: z.number(),
	title: z.string().min(1),
	season: z.object({
		number: z.number(),
	}),
	keywords: z
		.object({
			collection: z.array(
				z.object({
					value: z.string().min(1),
				}),
			),
		})
		.optional(),
	enclosure_url: z.string().min(1),
})

export type SimplecastEpisode = z.infer<typeof simplecastEpisodeSchema>

