import type { ReactNode } from 'react'
import { z } from 'zod'
import {
	callKentEpisodeArtParamsSchema,
	genericSocialParamsSchema,
	socialPreviewParamsSchema,
} from './schemas.ts'
import { CallKentEpisodeArt } from './templates/call-kent-episode-art.tsx'
import { GenericSocial } from './templates/generic-social.tsx'
import { SocialPreview } from './templates/social-preview.tsx'

export type OgTemplateName =
	| 'social-preview'
	| 'generic-social'
	| 'call-kent-episode-art'

type OgTemplateDefinition = {
	schema: z.ZodTypeAny
	version: number
	size: { width: number; height: number }
	component: (params: Record<string, unknown>) => ReactNode
}

export const ogTemplateRegistry = {
	'social-preview': {
		schema: socialPreviewParamsSchema,
		version: 1,
		size: { width: 1200, height: 630 },
		component: (params: Record<string, unknown>) => (
			<SocialPreview {...(params as Parameters<typeof SocialPreview>[0])} />
		),
	},
	'generic-social': {
		schema: genericSocialParamsSchema,
		version: 1,
		size: { width: 1200, height: 630 },
		component: (params: Record<string, unknown>) => (
			<GenericSocial {...(params as Parameters<typeof GenericSocial>[0])} />
		),
	},
	'call-kent-episode-art': {
		schema: callKentEpisodeArtParamsSchema,
		version: 5,
		size: { width: 1400, height: 1400 },
		component: (params: Record<string, unknown>) => (
			<CallKentEpisodeArt
				{...(params as Parameters<typeof CallKentEpisodeArt>[0])}
			/>
		),
	},
} satisfies Record<OgTemplateName, OgTemplateDefinition>

export function isOgTemplateName(value: string): value is OgTemplateName {
	return value in ogTemplateRegistry
}

export function getOgTemplate(name: OgTemplateName) {
	return ogTemplateRegistry[name]
}
