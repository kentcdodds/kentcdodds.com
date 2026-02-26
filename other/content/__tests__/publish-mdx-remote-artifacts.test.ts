import { expect, test } from 'vitest'
import {
	buildPublishPlan,
	filterChangedBulkEntries,
	getMdxEntryPathKey,
	isRetryableWranglerFailure,
	parseArgs,
	parseNameStatusOutput,
	toArtifactKey,
	toEntryKey,
} from '../publish-mdx-remote-artifacts.ts'

test('parseArgs requires kv binding and supports optional flags', () => {
	expect(() =>
		parseArgs(['--before', 'abc', '--after', 'def']),
	).toThrow(/missing required --kv-binding/i)

	expect(
		parseArgs([
			'--kv-binding',
			'MDX_REMOTE_KV',
			'--wrangler-config',
			'wrangler-preview.generated.jsonc',
			'--wrangler-env',
			'preview',
			'--before',
			'abc',
			'--after',
			'def',
			'--output-directory',
			'tmp/mdx',
			'--dry-run',
		]),
	).toEqual({
		kvBinding: 'MDX_REMOTE_KV',
		wranglerConfigPath: 'wrangler-preview.generated.jsonc',
		wranglerEnv: 'preview',
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

test('filterChangedBulkEntries excludes values already present in KV', () => {
	const filtered = filterChangedBulkEntries({
		bulkEntries: [
			{ key: 'blog/one.json', value: '{"slug":"one"}' },
			{ key: 'manifest.json', value: '{"count":1}' },
		],
		existingValues: {
			'blog/one.json': '{"slug":"one"}',
			'manifest.json': null,
		},
	})

	expect(filtered).toEqual([{ key: 'manifest.json', value: '{"count":1}' }])
})

test('isRetryableWranglerFailure matches transient Cloudflare API errors', () => {
	expect(isRetryableWranglerFailure('504 Gateway Timeout')).toBe(true)
	expect(isRetryableWranglerFailure('Received a malformed response from the API')).toBe(
		true,
	)
	expect(isRetryableWranglerFailure('Error 429: rate limit exceeded')).toBe(true)
	expect(isRetryableWranglerFailure('Unknown binding')).toBe(false)
})
