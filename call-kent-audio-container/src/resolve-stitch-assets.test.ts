import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { resolveStitchAssets } from './resolve-stitch-assets.ts'

test('resolveStitchAssets returns asset paths from assets', async () => {
	const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'call-kent-audio-assets-'))
	const root = path.join(cwd, 'assets')
	await fs.mkdir(root, { recursive: true })
	await Promise.all([
		fs.writeFile(path.join(root, 'intro.mp3'), ''),
		fs.writeFile(path.join(root, 'interstitial.mp3'), ''),
		fs.writeFile(path.join(root, 'outro.mp3'), ''),
	])

	try {
		const resolved = resolveStitchAssets({ cwd })
		assert.deepEqual(resolved, {
			introPath: path.join(root, 'intro.mp3'),
			interstitialPath: path.join(root, 'interstitial.mp3'),
			outroPath: path.join(root, 'outro.mp3'),
		})
	} finally {
		await fs.rm(cwd, { recursive: true, force: true })
	}
})

test('resolveStitchAssets throws when any stitch asset is missing', async () => {
	const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'call-kent-audio-assets-'))
	const root = path.join(cwd, 'assets')
	await fs.mkdir(root, { recursive: true })
	await Promise.all([
		fs.writeFile(path.join(root, 'intro.mp3'), ''),
		fs.writeFile(path.join(root, 'interstitial.mp3'), ''),
	])

	try {
		assert.throws(() => resolveStitchAssets({ cwd }), {
			message: `Missing stitch assets (intro/interstitial/outro). Expected files under: ${root}`,
		})
	} finally {
		await fs.rm(cwd, { recursive: true, force: true })
	}
	})
