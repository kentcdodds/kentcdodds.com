import { expect, test } from 'vitest'
import { parseArgs } from '../watch-mdx-remote-documents.ts'

function getExpectedDefaultSyncUrl() {
	return (
		process.env.MDX_REMOTE_SYNC_URL ??
		`http://localhost:${process.env.PORT ?? '3000'}/resources/mdx-remote-sync`
	)
}

test('parseArgs supports defaults and --once flag', () => {
	expect(parseArgs(['--once'])).toEqual({
		contentDirectory: 'content',
		outputDirectory: 'other/content/mdx-remote',
		once: true,
		syncUrl: getExpectedDefaultSyncUrl(),
		syncToken: process.env.INTERNAL_COMMAND_TOKEN ?? null,
	})
})

test('parseArgs supports directory overrides', () => {
	expect(
		parseArgs([
			'--content-directory',
			'tmp/content',
			'--output-directory',
			'tmp/output',
		]),
	).toEqual({
		contentDirectory: 'tmp/content',
		outputDirectory: 'tmp/output',
		once: false,
		syncUrl: getExpectedDefaultSyncUrl(),
		syncToken: process.env.INTERNAL_COMMAND_TOKEN ?? null,
	})
})

test('parseArgs supports sync overrides', () => {
	expect(
		parseArgs([
			'--sync-url',
			'http://localhost:3999/resources/mdx-remote-sync',
			'--sync-token',
			'test-token',
		]),
	).toEqual({
		contentDirectory: 'content',
		outputDirectory: 'other/content/mdx-remote',
		once: false,
		syncUrl: 'http://localhost:3999/resources/mdx-remote-sync',
		syncToken: 'test-token',
	})
})

test('parseArgs throws on unknown flags', () => {
	expect(() => parseArgs(['--wat'])).toThrow(/unknown argument/i)
})
