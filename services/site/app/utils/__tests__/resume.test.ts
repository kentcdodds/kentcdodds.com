import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import {
	getResumePath,
	getResumeView,
	THEATER_RESUME_VIEW,
} from '#app/utils/resume.ts'
import { parseTheaterResumeData } from '#app/utils/resume.server.ts'

test('getResumeView treats theater as a hidden resume view', () => {
	expect(getResumeView(null)).toBe('full')
	expect(getResumeView('short')).toBe('short')
	expect(getResumeView(THEATER_RESUME_VIEW)).toBe('theater')
	expect(getResumeView('performing')).toBe('full')
})

test('getResumePath keeps theater off the default resume URLs', () => {
	expect(getResumePath('full')).toBe('/resume')
	expect(getResumePath('short')).toBe('/resume?view=short')
	expect(getResumePath('theater')).toBe(`/resume?view=${THEATER_RESUME_VIEW}`)
})

test('theater resume YAML includes the performing arts credits', () => {
	const raw = fs.readFileSync(
		path.join(process.cwd(), 'content/data/theater-resume.yml'),
		'utf8',
	)
	const data = parseTheaterResumeData(raw)
	const theater = data.sections.find((section) => section.heading === 'Theater')
	const findingNeverland = theater?.credits.find(
		(credit) => credit.show === 'Finding Neverland',
	)

	expect(data.header.stats.voice).toBe('Tenor')
	expect(data.header.stats.height).toBe(`5'9"`)
	expect(findingNeverland).toMatchObject({
		role: 'Elliot',
		company: 'Alpine Community Theater',
		dates: '2026',
		href: 'https://alpinecommunitytheater.org/2026/07/09/finding-neverland-playing-now/',
	})
	expect(data.header.links).toEqual([
		{
			label: 'kentcdodds@gmail.com',
			href: 'mailto:kentcdodds@gmail.com',
			includeInPrint: true,
		},
	])
	expect(JSON.stringify(data)).not.toMatch(/801-|phone/i)
})
