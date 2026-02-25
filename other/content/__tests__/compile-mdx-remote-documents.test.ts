import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'
import {
	compileMdxRemoteDocuments,
	getCollectionFromPath,
	getOutputPath,
	getSlugFromPath,
	parseArgs,
	parseFrontmatter,
} from '../compile-mdx-remote-documents.ts'

test('parseArgs supports collection and dry-run flags', () => {
	expect(
		parseArgs([
			'--content-directory',
			'content',
			'--output-directory',
			'other/content/mdx-remote',
			'--collection',
			'blog',
			'--dry-run',
		]),
	).toEqual({
		contentDirectory: 'content',
		outputDirectory: 'other/content/mdx-remote',
		dryRun: true,
		collections: ['blog'],
		strictComponentValidation: false,
		strictExpressionValidation: false,
		continueOnError: false,
	})
})

test('parseArgs supports strict and continue-on-error flags', () => {
	expect(
		parseArgs([
			'--strict',
			'--strict-components',
			'--strict-expressions',
			'--continue-on-error',
		]),
	).toEqual({
		contentDirectory: 'content',
		outputDirectory: 'other/content/mdx-remote',
		dryRun: false,
		collections: ['blog', 'pages', 'writing-blog'],
		strictComponentValidation: true,
		strictExpressionValidation: true,
		continueOnError: true,
	})
})

test('parseFrontmatter separates frontmatter and body', () => {
	const source = `---
title: Hello world
draft: true
---

# Heading`
	expect(parseFrontmatter(source)).toEqual({
		frontmatter: { title: 'Hello world', draft: true },
		body: '\n# Heading',
	})
})

test('getCollectionFromPath and getSlugFromPath derive values', () => {
	expect(getCollectionFromPath('blog/post/index.mdx')).toBe('blog')
	expect(getSlugFromPath('blog/post/index.mdx')).toBe('post')
	expect(getSlugFromPath('pages/nested/path/index.mdx')).toBe('nested/path')
})

test('getOutputPath returns collection and slug scoped json path', () => {
	expect(
		getOutputPath({
			outputDirectory: '/tmp/out',
			collection: 'blog',
			slug: 'my-post',
		}),
	).toBe(path.resolve('/tmp/out', 'blog', 'my-post.json'))
})

test('compileMdxRemoteDocuments writes json artifacts and manifest', async () => {
	const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'mdx-remote-compile-'))
	const contentDirectory = path.join(rootDirectory, 'content')
	const outputDirectory = path.join(rootDirectory, 'compiled')
	await fs.mkdir(path.join(contentDirectory, 'blog', 'example-post'), {
		recursive: true,
	})
	await fs.writeFile(
		path.join(contentDirectory, 'blog', 'example-post', 'index.mdx'),
		`---
title: Example post
---

# Hello

<SubscribeForm formId="newsletter" kitFormId="kit-form" kitTagId="kit-tag" />
`,
		'utf8',
	)

	const { compiledEntries } = await compileMdxRemoteDocuments({
		contentDirectory,
		outputDirectory,
		dryRun: false,
		collections: ['blog'],
		strictComponentValidation: false,
		strictExpressionValidation: false,
		continueOnError: false,
	})

	expect(compiledEntries).toHaveLength(1)
	const compiledFile = path.join(outputDirectory, 'blog', 'example-post.json')
	const manifestFile = path.join(outputDirectory, 'manifest.json')
	expect(await fs.readFile(compiledFile, 'utf8')).toContain('"schemaVersion":1')
	expect(await fs.readFile(manifestFile, 'utf8')).toContain('"count": 1')
})

test('compileMdxRemoteDocuments can continue and report strict failures', async () => {
	const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'mdx-remote-errors-'))
	const contentDirectory = path.join(rootDirectory, 'content')
	const outputDirectory = path.join(rootDirectory, 'compiled')
	await fs.mkdir(path.join(contentDirectory, 'blog', 'valid-post'), {
		recursive: true,
	})
	await fs.mkdir(path.join(contentDirectory, 'blog', 'invalid-post'), {
		recursive: true,
	})
	await fs.writeFile(
		path.join(contentDirectory, 'blog', 'valid-post', 'index.mdx'),
		`---
title: Valid
---

# Hello
`,
		'utf8',
	)
	await fs.writeFile(
		path.join(contentDirectory, 'blog', 'invalid-post', 'index.mdx'),
		`---
title: Invalid
---

<NotAllowedComponent />
`,
		'utf8',
	)

	const result = await compileMdxRemoteDocuments({
		contentDirectory,
		outputDirectory,
		dryRun: true,
		collections: ['blog'],
		strictComponentValidation: true,
		strictExpressionValidation: true,
		continueOnError: true,
	})

	expect(result.compiledEntries).toHaveLength(1)
	expect(result.failedEntries).toHaveLength(1)
	expect(result.failedEntries[0]).toMatchObject({
		collection: 'blog',
		slug: 'invalid-post',
	})
})
