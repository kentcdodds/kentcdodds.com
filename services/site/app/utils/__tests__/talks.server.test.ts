import { expect, test } from 'vitest'
import {
	findTalkBySlug,
	normalizeSlugList,
	resolveTalkSlug,
} from '#app/utils/talks.server.ts'

test('resolveTalkSlug prefers an explicit slug over the title', () => {
	const calls: Array<string> = []
	expect(
		resolveTalkSlug(
			{
				title:
					'Closing the Agentic Loop: Getting Agents to Safely Build, Verify, and Ship',
				slug: 'closing-the-agentic-loop',
			},
			(title) => {
				calls.push(title)
				return title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
			},
		),
	).toBe('closing-the-agentic-loop')
	expect(calls).toEqual([
		'Closing the Agentic Loop: Getting Agents to Safely Build, Verify, and Ship',
	])
})

test('resolveTalkSlug falls back to slugifying the title', () => {
	expect(
		resolveTalkSlug({ title: 'Closing the Agentic Loop' }, (title) =>
			title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
		),
	).toBe('closing-the-agentic-loop')
})

test('resolveTalkSlug still advances the slugify counter when an explicit slug wins', () => {
	let count = 0
	const slugify = (_title: string) => {
		count += 1
		return count === 1 ? 'shared-title' : `shared-title-${count}`
	}
	expect(
		resolveTalkSlug({ title: 'Shared Title', slug: 'custom-slug' }, slugify),
	).toBe('custom-slug')
	expect(resolveTalkSlug({ title: 'Shared Title' }, slugify)).toBe(
		'shared-title-2',
	)
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
