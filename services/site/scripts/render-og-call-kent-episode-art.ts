import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { createElement } from 'react'
import satori, { init as initSatori } from 'satori/standalone'
import { Resvg, initWasm as initResvgWasm } from '@resvg/resvg-wasm'
import {
	computeCallKentEpisodeArtLayout,
	layoutBoxesForDump,
} from '../app/og/call-kent-episode-art-layout.ts'
import { CallKentEpisodeArt } from '../app/og/templates/call-kent-episode-art.tsx'
import {
	resolveAvatarDataUri,
	resolveMicIllustrationDataUri,
	resolveSocialBackgroundDataUri,
} from '../app/og/assets.server.ts'

const OUTPUT_DIR = '/tmp/og-iter2'
const require = createRequire(import.meta.url)

const roundAvatarDataUri =
	'data:image/svg+xml;base64,' +
	btoa(
		`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><circle cx="128" cy="128" r="128" fill="#5b6ee1"/><circle cx="128" cy="104" r="44" fill="#d8dcff"/><ellipse cx="128" cy="210" rx="72" ry="52" fill="#d8dcff"/></svg>`,
	)

const samples = [
	{
		filename: 'short-title.png',
		params: {
			title: 'Podcast breaks',
			name: '- Sarah',
			url: 'kentcdodds.com/calls/05/12',
			avatarKind: 'cloudinary' as const,
			avatarSource: 'kentcdodds.com/illustrations/kody/kody_profile_blue',
			avatarIsRound: false,
			size: 1400,
		},
	},
	{
		filename: 'long-title.png',
		params: {
			title:
				'How do I convince my team to adopt testing best practices without slowing down delivery?',
			name: '- Alexander',
			url: 'kentcdodds.com/calls/05/13',
			avatarKind: 'fetch' as const,
			avatarSource: roundAvatarDataUri,
			avatarIsRound: true,
			size: 1400,
		},
	},
	{
		filename: 'medium-title.png',
		params: {
			title: 'Podcast breaks and lessons learned',
			name: '- Jamie',
			url: 'kentcdodds.com/calls/05/14',
			avatarKind: 'fetch' as const,
			avatarSource: roundAvatarDataUri,
			avatarIsRound: true,
			size: 1400,
		},
	},
]

async function loadFonts() {
	const [regular, medium] = await Promise.all([
		fetch('https://kentcdodds.com/fonts/Matter-Regular.woff'),
		fetch('https://kentcdodds.com/fonts/Matter-Medium.woff'),
	])
	if (!regular.ok || !medium.ok) {
		throw new Error(
			`Failed to load fonts (${regular.status}, ${medium.status})`,
		)
	}
	return [
		{
			name: 'Matter',
			data: await regular.arrayBuffer(),
			weight: 400 as const,
			style: 'normal' as const,
		},
		{
			name: 'Matter',
			data: await medium.arrayBuffer(),
			weight: 500 as const,
			style: 'normal' as const,
		},
	]
}

async function main() {
	const yogaWasm = readFileSync(require.resolve('satori/yoga.wasm'))
	const resvgWasm = readFileSync(
		require.resolve('@resvg/resvg-wasm/index_bg.wasm'),
	)
	await initResvgWasm(resvgWasm)
	await initSatori(yogaWasm)

	const fonts = await loadFonts()
	const [background, mic] = await Promise.all([
		resolveSocialBackgroundDataUri(),
		resolveMicIllustrationDataUri(),
	])

	mkdirSync(OUTPUT_DIR, { recursive: true })
	const layoutDump: Record<string, unknown> = {}

	for (const sample of samples) {
		const layout = computeCallKentEpisodeArtLayout(
			sample.params.size,
			sample.params.title,
		)
		layoutDump[sample.filename] = layoutBoxesForDump(layout)

		const avatar = await resolveAvatarDataUri({
			avatarKind: sample.params.avatarKind,
			avatarSource: sample.params.avatarSource,
			size: 700,
		})

		const width = sample.params.size
		const height = sample.params.size
		const element = createElement(CallKentEpisodeArt, {
			...sample.params,
			background,
			avatar,
			mic,
		})
		const svg = await satori(element, { width, height, fonts })
		const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
		const png = resvg.render().asPng()
		resvg.free()

		if (png[0] !== 0x89 || png[1] !== 0x50 || png[2] !== 0x4e || png[3] !== 0x47) {
			throw new Error(`Invalid PNG for ${sample.filename}`)
		}

		writeFileSync(join(OUTPUT_DIR, sample.filename), png)
		console.log(`Wrote ${join(OUTPUT_DIR, sample.filename)} (${width}x${height})`)
	}

	writeFileSync(
		join(OUTPUT_DIR, 'layout.json'),
		`${JSON.stringify(layoutDump, null, 2)}\n`,
	)
	console.log(`Wrote ${join(OUTPUT_DIR, 'layout.json')}`)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
