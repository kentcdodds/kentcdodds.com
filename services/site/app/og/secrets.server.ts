import { getEnv } from '#app/utils/env.server.ts'

export function getOgImageSecret() {
	return getEnv().OG_IMAGE_SECRET
}
