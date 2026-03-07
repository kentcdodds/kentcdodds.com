import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import {
	getStitchAssetRoots,
	resolveStitchAssets,
} from './resolve-stitch-assets.ts'

test('getStitchAssetRoots keeps three unique roots when cwd is /app', () => {
	const roots = getStitchAssetRoots('/app')

	assert.deepEqual(roots, [
		'/app/assets/call-kent',
		'/assets/call-kent',
		'/app/app/assets/call-kent',
	])
	assert.equal(new Set(roots).size, 3)
})

test('resolveStitchAssets returns first root with all required files', () => {
	const cwd = '/app'
	const roots = getStitchAssetRoots(cwd)
	const successfulRoot = roots.at(1)
	assert.ok(successfulRoot)
	const existingFiles = new Set(
		['intro.mp3', 'interstitial.mp3', 'outro.mp3'].map((assetName) =>
			path.join(successfulRoot, assetName),
		),
	)

	const resolved = resolveStitchAssets({
		cwd,
		fileExists: (filePath) => existingFiles.has(filePath),
	})

	assert.deepEqual(resolved, {
		introPath: path.join(successfulRoot, 'intro.mp3'),
		interstitialPath: path.join(successfulRoot, 'interstitial.mp3'),
		outroPath: path.join(successfulRoot, 'outro.mp3'),
	})
})
