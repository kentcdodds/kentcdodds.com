import { z } from 'zod'

const shortText = z.string().trim().min(1).max(200)
const mediumText = z.string().trim().min(1).max(300)
const imageRef = z.string().trim().min(1).max(500)

export const socialPreviewParamsSchema = z.object({
	title: shortText,
	preTitle: shortText,
	url: mediumText,
	featuredImage: imageRef,
	featuredImageStyle: z.enum(['portrait', 'square']).optional().default('portrait'),
})

export const genericSocialParamsSchema = z.object({
	words: shortText,
	url: mediumText,
	featuredImage: imageRef,
})

export const callKentEpisodeArtParamsSchema = z.object({
	title: shortText,
	url: mediumText,
	name: z.string().trim().min(1).max(100),
	avatarKind: z.enum(['fetch', 'media']),
	avatarSource: imageRef,
	avatarIsRound: z.boolean(),
	size: z.number().int().min(400).max(2048).optional(),
})

export type SocialPreviewParams = z.infer<typeof socialPreviewParamsSchema>
export type GenericSocialParams = z.infer<typeof genericSocialParamsSchema>
export type CallKentEpisodeArtParams = z.infer<typeof callKentEpisodeArtParamsSchema>
