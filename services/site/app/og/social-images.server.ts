import { buildOgImageUrl } from './url.server.ts'
import { getOrigin } from '#app/utils/misc.ts'
import emojiRegex from 'emoji-regex'

function emojiStrip(string: string) {
	return string
		.replace(emojiRegex(), '')
		.split(' ')
		.filter(Boolean)
		.join(' ')
		.trim()
}

export function getSocialImageWithPreTitle({
	title,
	preTitle,
	featuredImage: img,
	url,
	featuredImageStyle = 'portrait',
	origin,
	secret,
}: {
	title: string
	preTitle: string
	featuredImage: string
	url: string
	featuredImageStyle?: 'portrait' | 'square'
	origin?: string
	secret: string
}) {
	return buildOgImageUrl(
		getOrigin({ origin: origin ?? 'https://kentcdodds.com', path: '' }),
		'social-preview',
		{
			title: emojiStrip(title),
			preTitle: emojiStrip(preTitle),
			url: emojiStrip(url),
			featuredImage: img,
			featuredImageStyle,
		},
		secret,
	)
}

export function getGenericSocialImage({
	words,
	featuredImage: img,
	url,
	origin,
	secret,
}: {
	words: string
	featuredImage: string
	url: string
	origin?: string
	secret: string
}) {
	return buildOgImageUrl(
		getOrigin({ origin: origin ?? 'https://kentcdodds.com', path: '' }),
		'generic-social',
		{
			words: emojiStrip(words),
			url: emojiStrip(url),
			featuredImage: img,
		},
		secret,
	)
}
