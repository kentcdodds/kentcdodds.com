import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { createElement } from 'react'
import satori, { init as initSatori } from 'satori/standalone'
import { Resvg, initWasm as initResvgWasm } from '@resvg/resvg-wasm'
import {
	computeCallKentEpisodeArtLayout,
	formatCallKentEpisodeArtTitle,
	layoutBoxesForDump,
} from '../app/og/call-kent-episode-art-layout.ts'
import {
	countSatoriSvgEmbeddedFontLines,
	countSatoriSvgTitleLinesInRegion,
} from '../app/og/call-kent-episode-art-svg.ts'
import { CallKentEpisodeArt } from '../app/og/templates/call-kent-episode-art.tsx'
import {
	resolveAvatarDataUri,
	resolveMicIllustrationDataUri,
	resolveSocialBackgroundDataUri,
} from '../app/og/assets.server.ts'

const OUTPUT_DIR = '/tmp/og-iter4'
const CANVAS = 1400
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
			avatarKind: 'media' as const,
			avatarSource: 'kentcdodds.com/illustrations/kody/kody_profile_blue',
			avatarIsRound: false,
			size: CANVAS,
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
			size: CANVAS,
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
			size: CANVAS,
		},
	},
]

function readPngDimensions(pngPath: string) {
	const buf = readFileSync(pngPath)
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

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

async function renderSvg(
	element: ReturnType<typeof createElement>,
	width: number,
	height: number,
	fonts: Awaited<ReturnType<typeof loadFonts>>,
) {
	return satori(element, { width, height, fonts })
}

async function renderPngFromSvg(svg: string, width: number) {
	const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
	const png = resvg.render().asPng()
	resvg.free()
	return png
}

function createTitleOnlyElement(
	layout: ReturnType<typeof computeCallKentEpisodeArtLayout>,
	displayTitle: string,
) {
	return createElement(
		'div',
		{
			style: {
				width: layout.title.width,
				height: layout.title.minHeight,
				display: 'flex',
				fontFamily: 'Matter',
				fontSize: layout.title.fontSize,
				fontWeight: 500,
				lineHeight: 1.1,
				lineClamp: 3,
				color: '#ffffff',
				backgroundColor: '#1f2028',
			},
		},
		displayTitle,
	)
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

	const layoutDump: Record<string, unknown> = {
		svgLineCounts: {} as Record<string, { titleOnly: number; full: number }>,
	}

	for (const sample of samples) {
		const layout = computeCallKentEpisodeArtLayout(
			sample.params.size,
			sample.params.title,
		)
		const displayTitle = formatCallKentEpisodeArtTitle(sample.params.title)
		const sampleDump = layoutBoxesForDump(layout)
		const titleOnlySvg = await renderSvg(
			createTitleOnlyElement(layout, displayTitle),
			layout.title.width,
			layout.title.minHeight,
			fonts,
		)
		const titleOnlyLines = countSatoriSvgEmbeddedFontLines(titleOnlySvg, {
			fontSize: layout.title.fontSize,
		})

		if (sample.filename === 'long-title.png') {
			writeFileSync(join(OUTPUT_DIR, 'long-title-text-only.svg'), titleOnlySvg)
			const titleOnlyPng = await renderPngFromSvg(
				titleOnlySvg,
				Math.round(layout.title.width),
			)
			writeFileSync(join(OUTPUT_DIR, 'long-title-text-only.png'), titleOnlyPng)
		}

		const avatar = await resolveAvatarDataUri({
			avatarKind: sample.params.avatarKind,
			avatarSource: sample.params.avatarSource,
			size: 700,
		})

		const fullSvg = await renderSvg(
			createElement(CallKentEpisodeArt, {
				...sample.params,
				background,
				avatar,
				mic,
			}),
			sample.params.size,
			sample.params.size,
			fonts,
		)
		const fullTitleLines = countSatoriSvgTitleLinesInRegion(fullSvg, {
			top: layout.title.top,
			height: layout.title.minHeight,
			fontSize: layout.title.fontSize,
		})

		;(layoutDump.svgLineCounts as Record<string, unknown>)[sample.filename] = {
			titleOnly: titleOnlyLines,
			full: fullTitleLines,
		}
		layoutDump[sample.filename] = sampleDump

		const png = await renderPngFromSvg(fullSvg, sample.params.size)
		if (png[0] !== 0x89 || png[1] !== 0x50 || png[2] !== 0x4e || png[3] !== 0x47) {
			throw new Error(`Invalid PNG for ${sample.filename}`)
		}

		writeFileSync(join(OUTPUT_DIR, sample.filename), png)
		const dims = readPngDimensions(join(OUTPUT_DIR, sample.filename))
		console.log(
			`${sample.filename}: font=${layout.title.fontSize.toFixed(1)} estimated=${layout.title.estimatedLines} svgLines(titleOnly=${titleOnlyLines}, full=${fullTitleLines}) -> ${dims.width}x${dims.height}`,
		)

		if (titleOnlyLines > 3 || fullTitleLines > 3) {
			throw new Error(
				`${sample.filename} rendered ${Math.max(titleOnlyLines, fullTitleLines)} title lines (max 3)`,
			)
		}
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
