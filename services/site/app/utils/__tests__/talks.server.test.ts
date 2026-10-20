import { expect, test } from 'vitest'
import {
	findTalkBySlug,
	normalizeSlugList,
	resolveTalkSlug,
} from '#app/utils/talks.server.ts'

test('resolveTalkSlug prefers an explicit slug over the title', () => {
	expect(
		resolveTalkSlug(
			{
				title:
					'Closing the Agentic Loop: Getting Agents to Safely Build, Verify, and Ship',
				slug: 'closing-the-agentic-loop',
			},
			(title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
		),
	).toBe('closing-the-agentic-loop')
})

test('resolveTalkSlug falls back to slugifying the title', () => {
	expect(
		resolveTalkSlug({ title: 'Closing the Agentic Loop' }, (title) =>
			title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
		),
	).toBe('closing-the-agentic-loop')
})

test('normalizeSlugList trims, drops empties, and dedupes', () => {
	expect(
		normalizeSlugList([
			' closing-the-agentic-loop ',
			'',
			'closing-the-agentic-loop',
			'legacy-slug',
		]),
	).toEqual(['closing-the-agentic-loop', 'legacy-slug'])
})

test('findTalkBySlug matches the canonical slug or a previous slug', () => {
	const talks = [
		{
			slug: 'closing-the-agentic-loop',
			previousSlugs: [
				'closing-the-agentic-loop-getting-agents-to-safely-build-verify-and-ship',
			],
			title: 'Closing the Agentic Loop',
		},
		{
			slug: 'other-talk',
			previousSlugs: [],
			title: 'Other Talk',
		},
	]

	expect(findTalkBySlug(talks, 'closing-the-agentic-loop')?.slug).toBe(
		'closing-the-agentic-loop',
	)
	expect(
		findTalkBySlug(
			talks,
			'closing-the-agentic-loop-getting-agents-to-safely-build-verify-and-ship',
		)?.slug,
	).toBe('closing-the-agentic-loop')
	expect(findTalkBySlug(talks, 'missing')).toBeUndefined()
})
