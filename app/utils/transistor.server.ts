import slugify from '@sindresorhus/slugify'
import * as uuid from 'uuid'
import { cache, cachified } from './cache.server.ts'
import { getEpisodePath } from './call-kent.ts'
import { stripHtml } from './markdown.server.ts'
import { getRequiredServerEnvVar, toBase64 } from './misc.tsx'
import { type Timings } from './timing.server.ts'
import { getDirectAvatarForUser } from './user-info.server.ts'
import {
	type CallKentEpisode,
	type TransistorAuthorizedJson,
	type TransistorCreateEpisodeData,
	type TransistorCreatedJson,
	type TransistorEpisodesJson,
	type TransistorErrorResponse,
	type TransistorPublishedJson,
	type TransistorUpdateEpisodeData,
} from '~/types.ts'

const transistorApiSecret = getRequiredServerEnvVar('TRANSISTOR_API_SECRET')
const podcastId = getRequiredServerEnvVar('CALL_KENT_PODCAST_ID', '67890')

async function fetchTransitor<JsonResponse>({
	endpoint,
	method = 'GET',
	query = {},
	data,
}: {
	endpoint: string
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
	query?: Record<string, string>
	data?: Record<string, unknown>
}) {
	const url = new URL(endpoint, 'https://api.transistor.fm')
	for (const [key, value] of Object.entries(query)) {
		url.searchParams.set(key, value)
	}
	const config: RequestInit = {
		method,
		headers: {
			'x-api-key': transistorApiSecret,
		},
	}
	if (data) {
		config.body = JSON.stringify(data)
		config.headers = {
			...config.headers,
			'Content-Type': 'application/json',
		}
	}
	const res = await fetch(url.toString(), config)
	const json = await res.json()
	if (json.errors) {
		throw new Error(
			(json as TransistorErrorResponse).errors.map((e) => e.title).join('\n'),
		)
	}
	return json as JsonResponse
}

async function createEpisode({
	audio,
	title,
	summary,
	description,
	keywords,
	user,
	request,
}: {
	audio: Buffer
	title: string
	summary: string
	description: string
	keywords: string
	user: { firstName: string; email: string; team: string }
	request: Request
}) {
	const id = uuid.v4()
	const authorized = await fetchTransitor<TransistorAuthorizedJson>({
		endpoint: 'v1/episodes/authorize_upload',
		query: { filename: `${id}.mp3` },
	})
	const { upload_url, audio_url, content_type } = authorized.data.attributes

	const episodesPerSeason = 50

	const currentSeason = await getCurrentSeason()

	await fetch(upload_url, {
		method: 'PUT',
		body: audio,
		headers: { 'Content-Type': content_type },
	})

	const createData: TransistorCreateEpisodeData = {
		episode: {
			show_id: podcastId,
			season: currentSeason,
			audio_url,
			title,
			summary,
			description,
			keywords,
			increment_number: true,
		},
	}

	const created = await fetchTransitor<TransistorCreatedJson>({
		endpoint: 'v1/episodes',
		method: 'POST',
		data: createData,
	})

	await fetchTransitor<TransistorPublishedJson>({
		endpoint: `/v1/episodes/${encodeURIComponent(created.data.id)}/publish`,
		method: 'PATCH',
		data: {
			episode: {
				status: 'published',
			},
		},
	})

	const returnValue: { episodeUrl?: string; imageUrl?: string } = {}
	// set the alternate_url if we have enough info for it.
	const { number } = created.data.attributes
	let season = currentSeason
	let episodeNumber = 1
	if (typeof number === 'number' && typeof season === 'number') {
		//reset episode to 1 if it exceeds episodesPerSeason (50)
		if (number > episodesPerSeason) {
			season += 1
			episodeNumber = 1
		} else {
			episodeNumber = number
		}

		const slug = slugify(created.data.attributes.title)
		const episodePath = getEpisodePath({
			episodeNumber,
			seasonNumber: season,
			slug,
		})

		// hard-coded because we're generating and uploading these images
		// and ultimately we know the domain it will be...
		const domainUrl = 'https://kentcdodds.com'

		const shortEpisodePath = getEpisodePath({
			episodeNumber: number,
			seasonNumber: season,
		})
		const shortDomain = domainUrl.replace(/^https?:\/\//, '')

		// cloudinary needs this to be double-encoded
		const encodedTitle = encodeURIComponent(encodeURIComponent(title))
		const encodedUrl = encodeURIComponent(
			encodeURIComponent(`${shortDomain}${shortEpisodePath}`),
		)
		const encodedName = encodeURIComponent(
			encodeURIComponent(`- ${user.firstName}`),
		)
		const { hasGravatar, avatar } = await getDirectAvatarForUser(user, {
			size: 1400,
			request,
			forceFresh: true,
		})
		const base64Avatar = toBase64(avatar)
		const radius = hasGravatar ? ',r_max' : ''
		const encodedAvatar = encodeURIComponent(base64Avatar)

		const textLines = Number(
			Math.ceil(Math.min(title.length, 50) / 18).toFixed(),
		)
		const avatarYPosition = textLines + 0.6
		const nameYPosition = -textLines + 5.2
		const imageUrl = `https://res.cloudinary.com/kentcdodds-com/image/upload/$th_3000,$tw_3000,$gw_$tw_div_12,$gh_$th_div_12/w_$tw,h_$th,l_kentcdodds.com:social-background/co_white,c_fit,g_north_west,w_$gw_mul_6,h_$gh_mul_2.6,x_$gw_mul_0.8,y_$gh_mul_0.8,l_text:kentcdodds.com:Matter-Medium.woff2_180:${encodedTitle}/c_crop${radius},g_north_west,h_$gh_mul_5.5,w_$gh_mul_5.5,x_$gw_mul_0.8,y_$gh_mul_${avatarYPosition},l_fetch:${encodedAvatar}/co_rgb:a9adc1,c_fit,g_south_west,w_$gw_mul_8,h_$gh_mul_4,x_$gw_mul_0.8,y_$gh_mul_0.8,l_text:kentcdodds.com:Matter-Regular.woff2_120:${encodedUrl}/co_rgb:a9adc1,c_fit,g_south_west,w_$gw_mul_8,h_$gh_mul_4,x_$gw_mul_0.8,y_$gh_mul_${nameYPosition},l_text:kentcdodds.com:Matter-Regular.woff2_140:${encodedName}/c_fit,g_east,w_$gw_mul_11,h_$gh_mul_11,x_$gw,l_kentcdodds.com:illustrations:mic/c_fill,w_$tw,h_$th/kentcdodds.com/social-background.png`

		returnValue.episodeUrl = `${domainUrl}${episodePath}`
		returnValue.imageUrl = imageUrl
		const updateData: TransistorUpdateEpisodeData = {
			id: created.data.id,
			episode: {
				alternate_url: returnValue.episodeUrl,
				image_url: imageUrl,
				description: `${description}\n\n<a href="${returnValue.episodeUrl}">${title}</a>`,
				number: episodeNumber,
				season,
			},
		}

		await fetchTransitor<TransistorPublishedJson>({
			endpoint: `/v1/episodes/${encodeURIComponent(created.data.id)}`,
			method: 'PATCH',
			data: updateData,
		})
	}

	// update the cache with the new episode
	await getCachedEpisodes({ forceFresh: true })

	return returnValue
}

async function getEpisodes() {
	const transistorEpisodes = await fetchTransitor<TransistorEpisodesJson>({
		endpoint: `/v1/episodes`,
		query: { 'pagination[per]': '5000' },
	})
	// sort by episode number
	const sortedTransistorEpisodes = transistorEpisodes.data.sort((a, b) => {
		const aNumber = a.attributes.number ?? 0
		const bNumber = b.attributes.number ?? 0
		if (aNumber < bNumber) {
			return -1
		} else if (aNumber > bNumber) {
			return 1
		}
		return 0
	})
	const episodes: Array<CallKentEpisode> = []
	for (const episode of sortedTransistorEpisodes) {
		if (episode.attributes.audio_processing) continue
		if (episode.attributes.status !== 'published') continue
		if (!episode.attributes.number) continue
		if (!episode.attributes.duration) continue

		episodes.push({
			seasonNumber: episode.attributes.season,
			episodeNumber: episode.attributes.number,
			slug: slugify(episode.attributes.title),
			title: episode.attributes.title,
			summary: episode.attributes.summary,
			descriptionHTML: episode.attributes.description,

			description: await stripHtml(episode.attributes.description),
			keywords: episode.attributes.keywords,
			duration: episode.attributes.duration,
			shareUrl: episode.attributes.share_url,
			mediaUrl: episode.attributes.media_url,
			embedHtml: episode.attributes.embed_html,
			embedHtmlDark: episode.attributes.embed_html_dark,
			imageUrl: episode.attributes.image_url,
			publishedAt: episode.attributes.published_at,
			updatedAt: episode.attributes.updated_at,
		})
	}
	return episodes
}

async function getCurrentSeason() {
	const episodesResponse = await fetchTransitor<TransistorEpisodesJson>({
		endpoint: `/v1/episodes`,
		query: {
			'pagination[per]': '1',
			order: 'desc',
		},
	})

	const lastEpisode = episodesResponse.data[0]
	return lastEpisode?.attributes.season
}

const episodesCacheKey = `transistor:episodes:${podcastId}`

async function getCachedEpisodes({
	request,
	forceFresh,
	timings,
}: {
	request?: Request
	forceFresh?: boolean
	timings?: Timings
}) {
	return cachified({
		cache,
		request,
		timings,
		key: episodesCacheKey,
		getFreshValue: getEpisodes,
		ttl: 1000 * 60 * 60 * 24,
		staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
		forceFresh,
		checkValue: (value: unknown) =>
			Array.isArray(value) &&
			value.every(
				(v) => typeof v.slug === 'string' && typeof v.title === 'string',
			),
	})
}

export { createEpisode, getCachedEpisodes as getEpisodes }
