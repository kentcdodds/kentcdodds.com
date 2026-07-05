import satori, { init as initSatori } from 'satori/standalone'
import { Resvg, initWasm as initResvgWasm } from '@resvg/resvg-wasm'
import yogaWasm from 'satori/yoga.wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import type { OgTemplateName } from './registry.tsx'
import { getOgTemplate } from './registry.tsx'
import { getOgFonts } from './fonts.server.ts'
import {
	resolveAvatarDataUri,
	resolveFeaturedImageDataUri,
	resolveKentProfileDataUri,
	resolveMicIllustrationDataUri,
	resolveSocialBackgroundDataUri,
	type OgAssetEnv,
} from './assets.server.ts'
import type {
	CallKentEpisodeArtParams,
	GenericSocialParams,
	SocialPreviewParams,
} from './schemas.ts'

let renderRuntimeReady: Promise<void> | null = null
let renderRuntimeInitialized = false

async function ensureRenderRuntime() {
	if (renderRuntimeInitialized) return
	if (!renderRuntimeReady) {
		renderRuntimeReady = (async () => {
			try {
				await initResvgWasm(resvgWasm)
			} catch (error) {
				if (
					!(error instanceof Error) ||
					!error.message.includes('Already initialized')
				) {
					throw error
				}
			}
			try {
				await initSatori(yogaWasm)
			} catch (error) {
				if (
					!(error instanceof Error) ||
					!error.message.includes('Already initialized')
				) {
					throw error
				}
			}
			renderRuntimeInitialized = true
		})().catch((error) => {
			renderRuntimeReady = null
			throw error
		})
	}
	await renderRuntimeReady
}

async function resolveTemplateAssets(
	template: OgTemplateName,
	params: SocialPreviewParams | GenericSocialParams | CallKentEpisodeArtParams,
	env?: OgAssetEnv,
) {
	const background = await resolveSocialBackgroundDataUri(env)

	if (template === 'call-kent-episode-art') {
		const episodeParams = params as CallKentEpisodeArtParams
		const avatarSize = Math.min(episodeParams.size ?? 1400, 700)
		const [avatar, mic] = await Promise.all([
			resolveAvatarDataUri({
				avatarKind: episodeParams.avatarKind,
				avatarSource: episodeParams.avatarSource,
				size: avatarSize,
				env,
			}),
			resolveMicIllustrationDataUri(env),
		])
		return { background, avatar, mic }
	}

	const [kentProfile, featuredImage] = await Promise.all([
		resolveKentProfileDataUri(env),
		resolveFeaturedImageDataUri(
			(params as SocialPreviewParams | GenericSocialParams).featuredImage,
			env,
		),
	])
	return { background, kentProfile, featuredImage }
}

export async function renderOgTemplatePng(
	templateName: OgTemplateName,
	params: SocialPreviewParams | GenericSocialParams | CallKentEpisodeArtParams,
	env?: OgAssetEnv,
	assets?: { fetch(request: Request): Response | Promise<Response> },
	request?: Request,
) {
	await ensureRenderRuntime()
	const template = getOgTemplate(templateName)
	const assetsResolved = await resolveTemplateAssets(templateName, params, env)
	const fonts = await getOgFonts(
		assets,
		request ? new URL(request.url).origin : undefined,
	)
	const width =
		templateName === 'call-kent-episode-art'
			? ((params as CallKentEpisodeArtParams).size ?? template.size.width)
			: template.size.width
	const height =
		templateName === 'call-kent-episode-art'
			? ((params as CallKentEpisodeArtParams).size ?? template.size.height)
			: template.size.height

	const element = template.component({ ...params, ...assetsResolved } as Record<
		string,
		unknown
	>)
	const svg = await satori(element, {
		width,
		height,
		fonts: fonts as never,
	})
	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: width },
	})
	const png = resvg.render().asPng()
	resvg.free()
	return { png, width, height }
}
