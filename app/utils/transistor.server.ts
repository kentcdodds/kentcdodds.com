import slugify from '@sindresorhus/slugify'
import * as uuid from 'uuid'
import {
	type CallKentEpisode,
	type TransistorAuthorizedJson,
	type TransistorCreateEpisodeData,
	type TransistorCreatedJson,
	type TransistorEpisodesJson,
	type TransistorErrorResponse,
	type TransistorPublishedJson,
	type TransistorUpdateEpisodeData,
} from '#app/types.ts'
import { images } from '../images.tsx'
import { cache, cachified, shouldForceFresh } from './cache.server.ts'
import { getCallKentEpisodeArtworkUrl } from './call-kent-artwork.ts'
import { getEpisodePath } from './call-kent.ts'
import {
	isCloudflareTranscriptionConfigured,
	transcribeMp3WithWorkersAi,
} from './cloudflare-ai-transcription.server.ts'
import { stripHtml } from './markdown.server.ts'
import { getRequiredServerEnvVar } from './misc.ts'
import { type Timings } from './timing.server.ts'
import { getDirectAvatarForUser } from './user-info.server.ts'

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
	// Handle Transistor rate limits: 10 req/10s. Retry on 429 after waiting.
	const maxRetries = 3
	let attempt = 0
	while (true) {
		const res = await fetch(url.toString(), config)
		if (res.status === 429 && attempt < maxRetries) {
			attempt++
			const retryAfterHeader = res.headers.get('Retry-After')
			// Retry-After can be seconds or HTTP-date; treat as seconds if numeric
			const retryAfterSeconds =
				retryAfterHeader && !Number.isNaN(Number(retryAfterHeader))
					? Number(retryAfterHeader)
					: 10
			await new Promise((r) => setTimeout(r, retryAfterSeconds * 1000))
			continue
		}

		const json = (await res.json()) as any
		if (!res.ok) {
			// Surface API errors with response text if available
			const message = json?.errors
				? (json as TransistorErrorResponse).errors
						.map((e: any) => e.title)
						.join('\n')
				: `HTTP ${res.status}`
			throw new Error(message)
		}
		if (json?.errors) {
			throw new Error(
				(json as TransistorErrorResponse).errors.map((e) => e.title).join('\n'),
			)
		}
		return json as JsonResponse
	}
}

async function updateEpisodeTranscriptText({
	episodeId,
	transcriptText,
}: {
	episodeId: string
	transcriptText: string
}) {
	const updateData: TransistorUpdateEpisodeData = {
		id: episodeId,
		episode: { transcript_text: transcriptText },
	}
	await fetchTransitor<TransistorPublishedJson>({
		endpoint: `/v1/episodes/${encodeURIComponent(episodeId)}`,
		method: 'PATCH',
		data: updateData,
	})
}

async function createEpisode({
	audio,
	title,
	summary,
	description,
	keywords,
	user,
	request,
	isAnonymous,
}: {
	audio: Buffer
	title: string
	summary: string
	description: string
	keywords: string
	user: { firstName: string; email: string; team: string }
	request: Request
	isAnonymous?: boolean
}) {
	// Start transcription ASAP, but don't block the admin publish flow.
	// If Workers AI isn't configured, this stays null and we just skip.
	const transcriptionPromise = isCloudflareTranscriptionConfigured()
		? transcribeMp3WithWorkersAi({ mp3: audio })
		: null

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
		body: new Uint8Array(audio),
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

	if (transcriptionPromise) {
		void transcriptionPromise
			.then(async (transcriptText) => {
				if (!transcriptText) return
				await updateEpisodeTranscriptText({
					episodeId: created.data.id,
					transcriptText,
				})
			})
			.catch((error: unknown) => {
				console.error(
					`Workers AI transcription failed for Transistor episode ${created.data.id}`,
					error,
				)
			})
	}

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
		const avatarSize = 1400
		const { hasGravatar, avatar } = isAnonymous
			? {
					hasGravatar: false,
					avatar: images.kodyProfileGray({
						resize: {
							type: 'pad',
							width: avatarSize,
							height: avatarSize,
						},
					}),
				}
			: await getDirectAvatarForUser(user, {
					size: avatarSize,
					request,
					forceFresh: true,
				})

		const imageUrl = getCallKentEpisodeArtworkUrl({
			title,
			url: `${shortDomain}${shortEpisodePath}`,
			name: `- ${user.firstName}`,
			avatarUrl: avatar,
			avatarIsRound: hasGravatar,
			size: 3000,
		})

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
	// Transistor's API max per-page is 100; fetch all pages sequentially
	const perPage = 100

	// Fetch first page to learn how many total pages there are
	const firstPage = await fetchTransitor<TransistorEpisodesJson>({
		endpoint: `/v1/episodes`,
		query: { 'pagination[per]': String(perPage), 'pagination[page]': '1' },
	})

	const allEpisodesData = [...firstPage.data]
	const totalPages = firstPage.meta?.totalPages ?? 1

	// Iterate remaining pages (if any) using a for-of loop
	for (const page of Array.from(
		{ length: Math.max(0, totalPages - 1) },
		(_, i) => i + 2,
	)) {
		const pageData = await fetchTransitor<TransistorEpisodesJson>({
			endpoint: `/v1/episodes`,
			query: {
				'pagination[per]': String(perPage),
				'pagination[page]': String(page),
			},
		})
		allEpisodesData.push(...pageData.data)
	}

	// sort by episode number
	const sortedTransistorEpisodes = allEpisodesData.sort((a, b) => {
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
		forceFresh: await shouldForceFresh({
			key: episodesCacheKey,
			forceFresh,
			request,
		}),
		checkValue: (value: unknown) =>
			Array.isArray(value) &&
			value.every(
				(v) => typeof v.slug === 'string' && typeof v.title === 'string',
			),
	})
}

export {
	createEpisode,
	getCachedEpisodes as getEpisodes,
	updateEpisodeTranscriptText,
}
