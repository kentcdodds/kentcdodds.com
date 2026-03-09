import { expect, test, vi } from 'vitest'
import { computeDeployPlan } from '../compute-deploy-plan.ts'

function createLogger() {
	return {
		log: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}
}

test('deploys the site when live diff includes a fly-deployable file', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'live-site-sha' } }
		}
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		return null
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'live-site-sha') {
				return [{ changeType: 'modified', filename: 'app/routes/index.tsx' }]
			}
			if (compareCommitSha === 'refresh-sha') {
				return [{ changeType: 'modified', filename: 'content/blog/post.mdx' }]
			}
			if (compareCommitSha === 'push-before-sha') {
				return [{ changeType: 'modified', filename: 'content/blog/post.mdx' }]
			}
			throw new Error(`Unexpected compare sha: ${compareCommitSha}`)
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(true)
	expect(deployPlan.refreshContent).toBe(true)
	expect(deployPlan.indexSemanticContent).toBe(true)
	expect(deployPlan.deployCallKentAudioWorker).toBe(false)
	expect(deployPlan.deployCallKentAudioContainer).toBe(false)
	expect(deployPlan.deployOauthWorker).toBe(false)
})

test('deploys the site when the site workflow changes', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		return { commit: { sha: 'live-site-sha' } }
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'live-site-sha') {
				return [
					{
						changeType: 'modified',
						filename: '.github/workflows/deploy-site.yml',
					},
				]
			}
			if (compareCommitSha === 'refresh-sha') {
				return []
			}
			if (compareCommitSha === 'push-before-sha') {
				return []
			}
			throw new Error(`Unexpected compare sha: ${compareCommitSha}`)
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(true)
	expect(deployPlan.deployOauthWorker).toBe(false)
})

test('skips site deploy when live diff only includes non-fly targets', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		return { commit: { sha: 'live-site-sha' } }
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'live-site-sha') {
				return [
					{ changeType: 'modified', filename: 'content/blog/post.mdx' },
					{
						changeType: 'modified',
						filename: 'call-kent-audio-worker/src/index.ts',
					},
				]
			}
			if (compareCommitSha === 'refresh-sha') {
				return []
			}
			if (compareCommitSha === 'push-before-sha') {
				return []
			}
			throw new Error(`Unexpected compare sha: ${compareCommitSha}`)
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(false)
})

test('plans audio deploys for workflow file changes', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		return { commit: { sha: 'live-site-sha' } }
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'live-site-sha') {
				return []
			}
			if (compareCommitSha === 'refresh-sha') {
				return []
			}
			if (compareCommitSha === 'push-before-sha') {
				return [
					{
						changeType: 'modified',
						filename: '.github/workflows/deploy-call-kent-audio-worker.yml',
					},
					{
						changeType: 'modified',
						filename: '.github/workflows/deploy-call-kent-audio-container.yml',
					},
				]
			}
			throw new Error(`Unexpected compare sha: ${compareCommitSha}`)
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		log,
	})

	expect(deployPlan.deployCallKentAudioWorker).toBe(true)
	expect(deployPlan.deployCallKentAudioContainer).toBe(true)
	expect(deployPlan.deployOauthWorker).toBe(false)
})

test('plans oauth worker deploys for oauth changes', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		return { commit: { sha: 'live-site-sha' } }
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'live-site-sha') {
				return [{ changeType: 'modified', filename: 'oauth/src/index.ts' }]
			}
			if (compareCommitSha === 'refresh-sha') {
				return []
			}
			if (compareCommitSha === 'push-before-sha') {
				return [{ changeType: 'modified', filename: 'oauth/src/index.ts' }]
			}
			throw new Error(`Unexpected compare sha: ${compareCommitSha}`)
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(false)
	expect(deployPlan.deployOauthWorker).toBe(true)
})

test('plans oauth worker deploys for workflow file changes', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		return { commit: { sha: 'live-site-sha' } }
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'live-site-sha') {
				return []
			}
			if (compareCommitSha === 'refresh-sha') {
				return []
			}
			if (compareCommitSha === 'push-before-sha') {
				return [
					{
						changeType: 'modified',
						filename: '.github/workflows/deploy-oauth-worker.yml',
					},
				]
			}
			throw new Error(`Unexpected compare sha: ${compareCommitSha}`)
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		log,
	})

	expect(deployPlan.deployOauthWorker).toBe(true)
})

test('treats app changes as semantic-content updates', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		return { commit: { sha: 'live-site-sha' } }
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'live-site-sha') {
				return []
			}
			if (compareCommitSha === 'refresh-sha') {
				return []
			}
			if (compareCommitSha === 'push-before-sha') {
				return [{ changeType: 'modified', filename: 'app/utils/misc.ts' }]
			}
			throw new Error(`Unexpected compare sha: ${compareCommitSha}`)
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		log,
	})

	expect(deployPlan.indexSemanticContent).toBe(true)
})

test('plans push-diff targets conservatively when push diff is unavailable', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		return { commit: { sha: 'live-site-sha' } }
	})
	const getChangedFilesImpl = vi.fn(async () => [])
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		currentCommitSha: 'current-sha',
		pushBeforeSha: null,
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		log,
	})

	expect(deployPlan.refreshContent).toBe(false)
	expect(deployPlan.indexSemanticContent).toBe(true)
	expect(deployPlan.deployCallKentAudioWorker).toBe(true)
	expect(deployPlan.deployCallKentAudioContainer).toBe(true)
	expect(deployPlan.deployOauthWorker).toBe(true)
})

test('leaves push-only execution to workflow gating during pull requests', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		return { commit: { sha: 'live-site-sha' } }
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'live-site-sha') {
				return [{ changeType: 'modified', filename: 'content/blog/post.mdx' }]
			}
			if (compareCommitSha === 'refresh-sha') {
				return [{ changeType: 'modified', filename: 'content/blog/post.mdx' }]
			}
			return []
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		currentCommitSha: 'current-sha',
		eventName: 'pull_request',
		fetchJsonImpl,
		getChangedFilesImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(false)
	expect(deployPlan.refreshContent).toBe(true)
	expect(deployPlan.indexSemanticContent).toBe(false)
	expect(deployPlan.deployCallKentAudioWorker).toBe(false)
	expect(deployPlan.deployCallKentAudioContainer).toBe(false)
	expect(deployPlan.deployOauthWorker).toBe(false)
})
