import { expect, test } from 'vitest'
import { parseArgs } from '../watch-mdx-remote-documents.ts'

test('parseArgs supports defaults and --once flag', () => {
	expect(parseArgs(['--once'])).toEqual({
		contentDirectory: 'content',
		outputDirectory: 'other/content/mdx-remote',
		once: true,
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
	})
})

test('parseArgs throws on unknown flags', () => {
	expect(() => parseArgs(['--wat'])).toThrow(/unknown argument/i)
})
