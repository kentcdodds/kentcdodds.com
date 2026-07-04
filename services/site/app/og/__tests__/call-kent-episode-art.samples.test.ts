import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { describe, expect, test } from 'vitest'
import {
	computeCallKentEpisodeArtLayout,
	layoutBoxesForDump,
} from '../call-kent-episode-art-layout.ts'

const OUTPUT_DIR = '/tmp/og-iter2'

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

describe('call-kent-episode-art sample renders', () => {
	test('layout boxes match grid math for sample inputs', () => {
		const g = 1400 / 12
		const shortSample = samples[0]!
		const longSample = samples[1]!
		const shortLayout = computeCallKentEpisodeArtLayout(
			1400,
			shortSample.params.title,
		)
		const longLayout = computeCallKentEpisodeArtLayout(
			1400,
			longSample.params.title,
		)

		expect(layoutBoxesForDump(shortLayout)).toMatchObject({
			textLines: 1,
			title: { left: 0.8 * g, top: 0.8 * g, width: 6 * g },
			avatar: { top: 1.6 * g, width: 5.5 * g },
			name: { bottom: 4.2 * g },
			url: { bottom: 0.8 * g },
		})
		expect(layoutBoxesForDump(longLayout)).toMatchObject({
			textLines: 3,
			avatar: { top: 3.6 * g },
			name: { bottom: 2.2 * g },
		})
		expect(longLayout.avatar.top).toBeGreaterThanOrEqual(
			longLayout.title.top + longLayout.title.height,
		)
	})

	test('render script writes 1400x1400 PNGs to /tmp/og-iter2', () => {
		execSync('node scripts/render-og-call-kent-episode-art.mjs', {
			cwd: join(process.cwd()),
			stdio: 'pipe',
			timeout: 120_000,
		})

		for (const sample of samples) {
			const pngPath = join(OUTPUT_DIR, sample.filename)
			expect(existsSync(pngPath)).toBe(true)
			const png = readFileSync(pngPath)
			expect(png[0]).toBe(0x89)
			expect(png[1]).toBe(0x50)
			expect(png[2]).toBe(0x4e)
			expect(png[3]).toBe(0x47)
		}

		expect(existsSync(join(OUTPUT_DIR, 'layout.json'))).toBe(true)
	}, 120_000)
})
