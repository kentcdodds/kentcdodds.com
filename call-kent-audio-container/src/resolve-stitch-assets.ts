import { existsSync } from 'node:fs'
import path from 'node:path'

export function getStitchAssetRoots(cwd = process.cwd()) {
	return [
		path.join(cwd, 'assets/call-kent'),
		path.join(cwd, '../assets/call-kent'),
		path.join(cwd, 'app/assets/call-kent'),
	]
}

export function resolveStitchAssets({
	cwd = process.cwd(),
	fileExists = existsSync,
}: {
	cwd?: string
	fileExists?: (filePath: string) => boolean
} = {}) {
	for (const root of getStitchAssetRoots(cwd)) {
		const introPath = path.join(root, 'intro.mp3')
		const interstitialPath = path.join(root, 'interstitial.mp3')
		const outroPath = path.join(root, 'outro.mp3')
		if ([introPath, interstitialPath, outroPath].every((assetPath) => fileExists(assetPath))) {
			return { introPath, interstitialPath, outroPath }
		}
	}

	throw new Error(
		'Missing stitch assets (intro/interstitial/outro). Expected assets/call-kent/*.mp3 to exist in container runtime.',
	)
}
