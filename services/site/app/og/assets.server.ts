import { buildImageUrl } from 'cloudinary-build-url'
import emojiRegex from 'emoji-regex'
import { CLOUDINARY_CLOUD_NAME } from './constants.ts'

const emojiPattern = emojiRegex()

export function stripEmoji(value: string) {
	return value
		.replace(emojiPattern, '')
		.split(' ')
		.filter(Boolean)
		.join(' ')
		.trim()
}

function bytesToDataUri(bytes: Uint8Array, contentType: string) {
	let binary = ''
	for (const byte of bytes) {
		binary += String.fromCharCode(byte)
	}
	return `data:${contentType};base64,${btoa(binary)}`
}

async function fetchAsDataUri(url: string, maxBytes = 5_000_000) {
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`Failed to fetch image (${response.status}): ${url}`)
	}
	const contentType = response.headers.get('content-type') ?? 'image/png'
	const buffer = await response.arrayBuffer()
	if (buffer.byteLength > maxBytes) {
		throw new Error(`Image too large (${buffer.byteLength} bytes): ${url}`)
	}
	return bytesToDataUri(new Uint8Array(buffer), contentType)
}

export function cloudinaryUrl(
	publicId: string,
	transformations?: Parameters<typeof buildImageUrl>[1],
) {
	return buildImageUrl(publicId, {
		cloud: { cloudName: CLOUDINARY_CLOUD_NAME },
		...transformations,
	})
}

export async function resolveFeaturedImageDataUri(featuredImage: string) {
	if (featuredImage.startsWith('data:')) {
		return featuredImage
	}
	if (featuredImage.startsWith('http://') || featuredImage.startsWith('https://')) {
		return fetchAsDataUri(featuredImage)
	}
	const url = cloudinaryUrl(featuredImage, {
		transformations: { resize: { width: 900 } },
	})
	return fetchAsDataUri(url)
}

export async function resolveKentProfileDataUri() {
	const url = cloudinaryUrl('kent/profile-transparent', {
		transformations: { resize: { width: 320, height: 320 } },
	})
	return fetchAsDataUri(url)
}

export async function resolveSocialBackgroundDataUri() {
	const url = cloudinaryUrl('kentcdodds.com/social-background.png', {
		transformations: { resize: { width: 2400, height: 1256 } },
	})
	return fetchAsDataUri(url)
}

export async function resolveAvatarDataUri({
	avatarKind,
	avatarSource,
	size,
}: {
	avatarKind: 'fetch' | 'cloudinary'
	avatarSource: string
	size: number
}) {
	if (avatarKind === 'fetch') {
		return fetchAsDataUri(avatarSource)
	}
	const url = cloudinaryUrl(avatarSource, {
		transformations: {
			resize: {
				width: size,
				height: size,
			},
		},
	})
	return fetchAsDataUri(url)
}

export async function resolveMicIllustrationDataUri() {
	const url = cloudinaryUrl('kentcdodds.com/illustrations/mic', {
		transformations: {
			resize: {
				height: 1900,
			},
		},
	})
	return fetchAsDataUri(url)
}

export type OgResolvedAssets = {
	background: string
	kentProfile: string
	featuredImage?: string
	avatar?: string
	mic?: string
}
