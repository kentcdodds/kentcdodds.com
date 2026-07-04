import { getDisplayUrl, getOrigin, getUrl } from '#app/utils/misc.ts'
import { getOgImageSecret } from './secrets.server.ts'
import { buildOgImageUrl } from './url.server.ts'

export function getOgMetaContext(requestInfo?: { origin: string; path: string }) {
	return {
		origin: getOrigin(requestInfo),
		secret: getOgImageSecret(),
		displayUrl: getDisplayUrl(requestInfo),
		pageUrl: getUrl(requestInfo),
	}
}

export function getLegacyGenericSocialImageUrl(origin = 'https://kentcdodds.com') {
	const secret = getOgImageSecret()
	return buildOgImageUrl(
		origin,
		'generic-social',
		{
			words:
				'Helping people make the world a better place through quality software.',
			url: 'kentcdodds.com',
			featuredImage:
				'kentcdodds.com/illustrations/kody/kody_snowboarding_flying_blue',
		},
		secret,
	)
}
