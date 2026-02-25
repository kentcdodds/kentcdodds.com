import { expect, test } from 'vitest'
import {
	buildPublishPlan,
	getMdxEntryPathKey,
	parseArgs,
	parseNameStatusOutput,
	toArtifactKey,
	toEntryKey,
} from '../publish-mdx-remote-artifacts.ts'

test('parseArgs requires bucket and supports optional flags', () => {
	expect(() =>
		parseArgs(['--before', 'abc', '--after', 'def']),
	).toThrow(/missing required --bucket/i)

	expect(
		parseArgs([
			'--bucket',
			'mdx-artifacts',
			'--before',
			'abc',
			'--after',
			'def',
			'--output-directory',
			'tmp/mdx',
			'--dry-run',
		]),
	).toEqual({
		bucket: 'mdx-artifacts',
		beforeSha: 'abc',
		afterSha: 'def',
		outputDirectory: 'tmp/mdx',
		dryRun: true,
	})
})

test('getMdxEntryPathKey supports content collections', () => {
	expect(getMdxEntryPathKey('content/blog/post/index.mdx')).toBe('blog:post')
	expect(getMdxEntryPathKey('content/pages/about/index.mdx')).toBe('pages:about')
	expect(getMdxEntryPathKey('content/writing-blog/note/image.png')).toBe(
		'writing-blog:note',
	)
	expect(getMdxEntryPathKey('app/routes/index.tsx')).toBeNull()
})

test('parseNameStatusOutput captures adds, mods, deletes and renames', () => {
	const parsed = parseNameStatusOutput(
		[
			'M\tcontent/blog/one/index.mdx',
			'A\tcontent/pages/about/index.mdx',
			'D\tcontent/blog/deleted/index.mdx',
			'R100\tcontent/blog/old-slug/index.mdx\tcontent/blog/new-slug/index.mdx',
		].join('\n'),
	)

	expect(parsed.changedEntries).toEqual(
		new Set(['blog:one', 'pages:about', 'blog:new-slug']),
	)
	expect(parsed.deletedEntries).toEqual(new Set(['blog:deleted', 'blog:old-slug']))
})

test('buildPublishPlan filters uploads to changed entries', () => {
	const compiledEntries = [
		{
			collection: 'blog',
			slug: 'one',
			outputPath: '/tmp/blog/one.json',
		},
		{
			collection: 'pages',
			slug: 'about',
			outputPath: '/tmp/pages/about.json',
		},
		{
			collection: 'blog',
			slug: 'old-slug',
			outputPath: '/tmp/blog/old-slug.json',
		},
	]
	const plan = buildPublishPlan({
		compiledEntries,
		changedSummary: {
			changedEntries: new Set(['blog:one', 'pages:about']),
			deletedEntries: new Set(['blog:old-slug']),
		},
	})

	expect(plan.uploadEntries.map((entry) => toEntryKey(entry))).toEqual([
		'blog:one',
		'pages:about',
	])
	expect(plan.deleteKeys).toEqual(['blog/old-slug.json'])
	expect(toArtifactKey({ collection: 'blog', slug: 'one' })).toBe('blog/one.json')
})
