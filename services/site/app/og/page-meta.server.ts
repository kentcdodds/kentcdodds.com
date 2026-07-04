import { getSocialMetas } from '#app/utils/seo.ts'
import { getDomainUrl } from '#app/utils/misc.ts'
import { getOgMetaContext } from './meta.server.ts'
import {
	getGenericSocialImage,
	getSocialImageWithPreTitle,
} from './social-images.server.ts'

type RequestInfo = { origin: string; path: string } | undefined

type SocialPreviewImage = {
	kind: 'social-preview'
	preTitle: string
	title: string
	featuredImage: string
	featuredImageStyle?: 'portrait' | 'square'
}

type GenericSocialImage = {
	kind: 'generic-social'
	words: string
	featuredImage: string
}

type BuildPageSocialMetasOptions = {
	title: string
	description: string
	keywords?: string
	ogType?: 'website' | 'article'
	url?: string
	image?: string
	socialImage?: SocialPreviewImage | GenericSocialImage
}

export function buildPageSocialMetas(
	requestInfo: RequestInfo,
	options: BuildPageSocialMetasOptions,
) {
	const og = getOgMetaContext(requestInfo)
	let image = options.image
	if (!image && options.socialImage) {
		if (options.socialImage.kind === 'social-preview') {
			image = getSocialImageWithPreTitle({
				url: og.displayUrl,
				origin: og.origin,
				secret: og.secret,
				preTitle: options.socialImage.preTitle,
				title: options.socialImage.title,
				featuredImage: options.socialImage.featuredImage,
				featuredImageStyle: options.socialImage.featuredImageStyle,
			})
		} else {
			image = getGenericSocialImage({
				url: og.displayUrl,
				origin: og.origin,
				secret: og.secret,
				words: options.socialImage.words,
				featuredImage: options.socialImage.featuredImage,
			})
		}
	}

	return getSocialMetas({
		title: options.title,
		description: options.description,
		keywords: options.keywords,
		ogType: options.ogType,
		url: options.url ?? og.pageUrl,
		image,
	})
}

export function buildPageSocialMetasForRequest(
	request: Request,
	options: BuildPageSocialMetasOptions,
) {
	const url = new URL(request.url)
	return buildPageSocialMetas(
		{ origin: getDomainUrl(request), path: url.pathname },
		options,
	)
}

export function buildPageSocialMetasFromMatches(
	matches: Array<{ id: string; data?: unknown }>,
	options: BuildPageSocialMetasOptions,
) {
	const requestInfo = matches.find((match) => match.id === 'root')?.data as
		| { requestInfo?: RequestInfo }
		| undefined
	return buildPageSocialMetas(requestInfo?.requestInfo, options)
}
