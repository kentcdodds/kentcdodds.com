import { type User } from '#app/types.ts'
import { getImageBuilder, images } from '../images.tsx'
import * as k from '../kit/kit.server.ts'
import { cache, cachified } from './cache.server.ts'
import * as discord from './discord.server.ts'
import { fetchWithTimeout } from './fetch-with-timeout.server.ts'
import { getAvatar, getOptionalTeam } from './misc-react.tsx'
import { type Timings } from './timing.server.ts'

type UserInfo = {
	avatar: {
		src: string
		alt: string
		hasGravatar: boolean
	}
	kit: {
		tags: Array<{ id: string; name: string }>
	} | null
	discord: {
		username: string
	} | null
}

export async function gravatarExistsForEmail({
	email,
	request,
	timings,
	forceFresh,
}: {
	email: string
	request?: Request
	timings?: Timings
	forceFresh?: boolean
}) {
	return cachified({
		key: `gravatar-exists-for:${email}`,
		cache,
		request,
		timings,
		forceFresh,
		ttl: 1000 * 60 * 60 * 24 * 90,
		staleWhileRevalidate: 1000 * 60 * 60 * 24 * 365,
		checkValue: (prevValue) => typeof prevValue === 'boolean',
		getFreshValue: async (context) => {
			const gravatarUrl = getAvatar(email, { fallback: '404' })
			try {
				const timeoutMs = context.background || forceFresh ? 1000 * 10 : 100
				const avatarResponse = await fetchWithTimeout(
					gravatarUrl,
					{ method: 'HEAD' },
					timeoutMs,
				)
				if (avatarResponse.status === 200) {
					context.metadata.ttl = 1000 * 60 * 60 * 24 * 365
					return true
				} else {
					context.metadata.ttl = 1000 * 60
					return false
				}
			} catch (error: unknown) {
				console.error(`Error getting gravatar for ${email}:`, error)
				context.metadata.ttl = 1000 * 60
				return false
			}
		},
	})
}

async function getDirectAvatarForUser(
	{ email, team }: Pick<User, 'email' | 'team'>,
	{
		size = 128,
		request,
		timings,
		forceFresh,
	}: {
		size: number
		request: Request
		timings?: Timings
		forceFresh?: boolean
	},
) {
	const hasGravatar = await gravatarExistsForEmail({
		email,
		request,
		timings,
		forceFresh,
	})
	if (hasGravatar) {
		return { hasGravatar, avatar: getAvatar(email, { size, fallback: null }) }
	} else {
		const imageProfileIds = {
			RED: images.kodyProfileRed.id,
			BLUE: images.kodyProfileBlue.id,
			YELLOW: images.kodyProfileYellow.id,
			UNKNOWN: images.kodyProfileGray.id,
		}
		return {
			hasGravatar,
			avatar: getImageBuilder(imageProfileIds[getOptionalTeam(team)])({
				resize: {
					type: 'pad',
					width: size,
					height: size,
				},
			}),
		}
	}
}

const getKitCacheKey = (kitId: string) => `kit:${kitId}`
const getDiscordCacheKey = (discordId: string) => `discord:${discordId}`

async function getUserInfo(
	user: User,
	{
		request,
		forceFresh,
		timings,
	}: { request: Request; forceFresh?: boolean; timings?: Timings },
) {
	const { discordId, kitId, email } = user
	const [discordUser, kitInfo] = await Promise.all([
		discordId
			? cachified({
					cache,
					request,
					timings,
					forceFresh,
					ttl: 1000 * 60 * 60 * 24 * 30,
					staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
					key: getDiscordCacheKey(discordId),
					checkValue: (value: unknown) =>
						typeof value === 'object' && value !== null && 'id' in value,
					getFreshValue: async () => {
						const result = await discord.getDiscordUser(discordId)
						return result
					},
				})
			: null,
		kitId
			? cachified({
					cache,
					request,
					timings,
					forceFresh,
					ttl: 1000 * 60 * 60 * 24 * 30,
					staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
					key: getKitCacheKey(kitId),
					checkValue: (value: unknown) =>
						typeof value === 'object' && value !== null && 'tags' in value,
					getFreshValue: async () => {
						const subscriber = await k.getKitSubscriber(email)
						if (!subscriber) {
							return {
								tags: [],
							}
						}
						const tags = await k.getKitSubscriberTags(subscriber.id)
						return {
							tags: tags.map(({ name, id }) => ({ name, id })),
						}
					},
				})
			: null,
	])

	const { avatar, hasGravatar } = await getDirectAvatarForUser(user, {
		size: 128,
		request,
		timings,
	})
	const userInfo: UserInfo = {
		avatar: {
			src: avatar,
			alt: user.firstName,
			hasGravatar,
		},
		discord: discordUser,
		kit: kitInfo,
	}
	return userInfo
}

async function deleteKitCache(kitId: string | number) {
	await cache.delete(getKitCacheKey(String(kitId)))
}

async function deleteDiscordCache(discordId: string) {
	await cache.delete(getDiscordCacheKey(discordId))
}

export {
	getUserInfo,
	deleteKitCache,
	deleteDiscordCache,
	getDirectAvatarForUser,
}
