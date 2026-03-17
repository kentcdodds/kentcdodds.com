import { expect, test, vi } from 'vitest'
import { computeDeployPlan } from '../compute-deploy-plan.ts'

function createLogger() {
	return {
		log: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}
}

function createMockDeploymentFetch(shaByEnvironment = {}) {
	const defaultSha = shaByEnvironment['*'] ?? 'deployed-sha'
	return vi.fn(async (url) => {
		if (!url.includes('api.github.com') || !url.includes('deployments')) {
			throw new Error(`Unexpected fetch URL: ${url}`)
		}
		if (url.includes('/statuses')) {
			return { ok: true, json: async () => [{ state: 'success' }] }
		}
		const envMatch = url.match(/environment=([^&]+)/)
		const env = envMatch ? decodeURIComponent(envMatch[1]) : 'default'
		const sha = shaByEnvironment[env] ?? defaultSha
		return { ok: true, json: async () => [{ id: 1, sha }] }
	})
}

const defaultDeployPlanOpts = {
	repository: 'owner/repo',
	token: 'test-token',
	refName: 'main',
}

test('deploys the site when deployment diff includes a fly-deployable file', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const fetchImpl = createMockDeploymentFetch({
		'site-production': 'deployed-site-sha',
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'deployed-site-sha') {
				return [{ changeType: 'modified', filename: 'services/site/app/routes/index.tsx' }]
			}
			if (compareCommitSha === 'refresh-sha') {
				return [{ changeType: 'modified', filename: 'services/site/content/blog/post.mdx' }]
			}
			if (compareCommitSha === 'push-before-sha') {
				return [{ changeType: 'modified', filename: 'services/site/content/blog/post.mdx' }]
			}
			if (compareCommitSha === 'deployed-sha') {
				return []
			}
			throw new Error(`Unexpected compare sha: ${compareCommitSha}`)
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		...defaultDeployPlanOpts,
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		fetchImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(true)
	expect(deployPlan.refreshContent).toBe(true)
	expect(deployPlan.indexSemanticContent).toBe(true)
	expect(deployPlan.deploySearchWorker).toBe(false)
	expect(deployPlan.deployCallKentAudioWorker).toBe(false)
	expect(deployPlan.deployOauthWorker).toBe(false)
})

test('deploys the site when the site workflow changes', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const fetchImpl = createMockDeploymentFetch({
		'site-production': 'deployed-site-sha',
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'deployed-site-sha') {
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
			if (compareCommitSha === 'deployed-sha') {
				return []
			}
			throw new Error(`Unexpected compare sha: ${compareCommitSha}`)
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		...defaultDeployPlanOpts,
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		fetchImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(true)
	expect(deployPlan.deploySearchWorker).toBe(false)
	expect(deployPlan.deployOauthWorker).toBe(false)
})

test('skips site deploy when deployment diff only includes non-fly targets', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const fetchImpl = createMockDeploymentFetch({
		'site-production': 'deployed-site-sha',
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'deployed-site-sha') {
				return [
					{ changeType: 'modified', filename: 'services/site/content/blog/post.mdx' },
					{
						changeType: 'modified',
						filename: 'services/call-kent-audio-worker/src/index.ts',
					},
				]
			}
			if (compareCommitSha === 'refresh-sha') {
				return []
			}
			if (compareCommitSha === 'push-before-sha') {
				return []
			}
			if (compareCommitSha === 'deployed-sha') {
				return []
			}
			throw new Error(`Unexpected compare sha: ${compareCommitSha}`)
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		...defaultDeployPlanOpts,
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		fetchImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(true)
})

test('plans search worker deploys for shared contract changes', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const fetchImpl = createMockDeploymentFetch({
		'site-production': 'deployed-site-sha',
		'search-worker-production': 'deployed-search-worker-sha',
		'oauth-production': 'deployed-oauth-sha',
		'call-kent-audio-worker-production': 'deployed-audio-worker-sha',
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'deployed-site-sha') {
				return [{ changeType: 'modified', filename: 'services/search-shared/src/search-shared.ts' }]
			}
			if (compareCommitSha === 'deployed-search-worker-sha') {
				return [{ changeType: 'modified', filename: 'services/search-worker/src/index.ts' }]
			}
			if (compareCommitSha === 'deployed-oauth-sha') {
				return []
			}
			if (compareCommitSha === 'deployed-audio-worker-sha') {
				return []
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
		...defaultDeployPlanOpts,
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		fetchImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(true)
	expect(deployPlan.deploySearchWorker).toBe(true)
	expect(deployPlan.deployCallKentAudioWorker).toBe(false)
	expect(deployPlan.deployOauthWorker).toBe(false)
})

test('plans search worker deploys for search-shared package changes', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const fetchImpl = createMockDeploymentFetch({
		'site-production': 'deployed-site-sha',
		'search-worker-production': 'deployed-search-worker-sha',
		'oauth-production': 'deployed-oauth-sha',
		'call-kent-audio-worker-production': 'deployed-audio-worker-sha',
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'deployed-site-sha') {
				return [
					{
						changeType: 'modified',
						filename: 'services/search-shared/src/search-shared.ts',
					},
				]
			}
			if (compareCommitSha === 'deployed-search-worker-sha') {
				return [
					{
						changeType: 'modified',
						filename: 'services/search-shared/src/search-shared.ts',
					},
				]
			}
			if (compareCommitSha === 'deployed-oauth-sha') {
				return []
			}
			if (compareCommitSha === 'deployed-audio-worker-sha') {
				return []
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
		...defaultDeployPlanOpts,
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		fetchImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(true)
	expect(deployPlan.deploySearchWorker).toBe(true)
})

test('plans audio deploys for workflow file changes', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const fetchImpl = createMockDeploymentFetch({
		'site-production': 'deployed-site-sha',
		'search-worker-production': 'deployed-search-worker-sha',
		'oauth-production': 'deployed-oauth-sha',
		'call-kent-audio-worker-production': 'deployed-audio-worker-sha',
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'deployed-site-sha') {
				return []
			}
			if (compareCommitSha === 'deployed-audio-worker-sha') {
				return [
					{
						changeType: 'modified',
						filename: '.github/workflows/deploy-call-kent-audio-worker.yml',
					},
				]
			}
			if (compareCommitSha === 'deployed-search-worker-sha') {
				return []
			}
			if (compareCommitSha === 'deployed-oauth-sha') {
				return []
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
		...defaultDeployPlanOpts,
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		fetchImpl,
		log,
	})

	expect(deployPlan.deploySearchWorker).toBe(false)
	expect(deployPlan.deployCallKentAudioWorker).toBe(true)
	expect(deployPlan.deployOauthWorker).toBe(false)
})

test('plans oauth worker deploys for oauth changes', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const fetchImpl = createMockDeploymentFetch({
		'site-production': 'deployed-site-sha',
		'search-worker-production': 'deployed-search-worker-sha',
		'oauth-production': 'deployed-oauth-sha',
		'call-kent-audio-worker-production': 'deployed-audio-worker-sha',
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'deployed-site-sha') {
				return [{ changeType: 'modified', filename: 'services/oauth/src/index.ts' }]
			}
			if (compareCommitSha === 'deployed-oauth-sha') {
				return [{ changeType: 'modified', filename: 'services/oauth/src/index.ts' }]
			}
			if (compareCommitSha === 'deployed-search-worker-sha') {
				return []
			}
			if (compareCommitSha === 'deployed-audio-worker-sha') {
				return []
			}
			if (compareCommitSha === 'refresh-sha') {
				return []
			}
			if (compareCommitSha === 'push-before-sha') {
				return [{ changeType: 'modified', filename: 'services/oauth/src/index.ts' }]
			}
			throw new Error(`Unexpected compare sha: ${compareCommitSha}`)
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		...defaultDeployPlanOpts,
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		fetchImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(false)
	expect(deployPlan.deploySearchWorker).toBe(false)
	expect(deployPlan.deployOauthWorker).toBe(true)
})

test('plans oauth worker deploys for workflow file changes', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const fetchImpl = createMockDeploymentFetch({
		'site-production': 'deployed-site-sha',
		'search-worker-production': 'deployed-search-worker-sha',
		'oauth-production': 'deployed-oauth-sha',
		'call-kent-audio-worker-production': 'deployed-audio-worker-sha',
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'deployed-site-sha') {
				return []
			}
			if (compareCommitSha === 'deployed-oauth-sha') {
				return [
					{
						changeType: 'modified',
						filename: '.github/workflows/deploy-oauth-worker.yml',
					},
				]
			}
			if (compareCommitSha === 'deployed-search-worker-sha') {
				return []
			}
			if (compareCommitSha === 'deployed-audio-worker-sha') {
				return []
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
		...defaultDeployPlanOpts,
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		fetchImpl,
		log,
	})

	expect(deployPlan.deploySearchWorker).toBe(false)
	expect(deployPlan.deployOauthWorker).toBe(true)
})

test('treats app changes as semantic-content updates', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const fetchImpl = createMockDeploymentFetch()
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'deployed-site-sha' || compareCommitSha === 'deployed-sha') {
				return []
			}
			if (compareCommitSha === 'refresh-sha') {
				return []
			}
			if (compareCommitSha === 'push-before-sha') {
				return [{ changeType: 'modified', filename: 'services/site/app/utils/misc.ts' }]
			}
			throw new Error(`Unexpected compare sha: ${compareCommitSha}`)
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		...defaultDeployPlanOpts,
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		fetchImpl,
		log,
	})

	expect(deployPlan.indexSemanticContent).toBe(true)
})

test('plans deploy targets when no deployment state available', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const getChangedFilesImpl = vi.fn(async () => [])
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		currentCommitSha: 'current-sha',
		pushBeforeSha: null,
		eventName: 'push',
		repository: undefined,
		fetchJsonImpl,
		getChangedFilesImpl,
		log,
	})

	expect(deployPlan.refreshContent).toBe(false)
	expect(deployPlan.indexSemanticContent).toBe(true)
	expect(deployPlan.deploySite).toBe(true)
	expect(deployPlan.deploySearchWorker).toBe(true)
	expect(deployPlan.deployCallKentAudioWorker).toBe(true)
	expect(deployPlan.deployOauthWorker).toBe(true)
})

test('leaves push-only execution to workflow gating during pull requests', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const fetchImpl = createMockDeploymentFetch({
		'site-production': 'deployed-site-sha',
		'oauth-production': 'deployed-oauth-sha',
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'deployed-site-sha') {
				return [{ changeType: 'modified', filename: 'services/site/content/blog/post.mdx' }]
			}
			if (compareCommitSha === 'refresh-sha') {
				return [{ changeType: 'modified', filename: 'services/site/content/blog/post.mdx' }]
			}
			if (compareCommitSha === 'deployed-sha') {
				return []
			}
			return []
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		...defaultDeployPlanOpts,
		currentCommitSha: 'current-sha',
		eventName: 'pull_request',
		refName: 'main',
		fetchJsonImpl,
		getChangedFilesImpl,
		fetchImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(false)
	expect(deployPlan.refreshContent).toBe(true)
	expect(deployPlan.indexSemanticContent).toBe(false)
	expect(deployPlan.deploySearchWorker).toBe(false)
	expect(deployPlan.deployCallKentAudioWorker).toBe(false)
	expect(deployPlan.deployOauthWorker).toBe(false)
})

test('failed deploy stays deployable across unrelated push', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const fetchImpl = createMockDeploymentFetch({
		'site-production': 'deployed-site-sha',
		'search-worker-production': 'deployed-search-worker-sha',
		'oauth-production': 'last-successful-oauth-sha',
		'call-kent-audio-worker-production': 'deployed-audio-worker-sha',
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'deployed-site-sha') {
				return []
			}
			if (compareCommitSha === 'last-successful-oauth-sha') {
				return [
					{ changeType: 'modified', filename: 'services/oauth/src/index.ts' },
					{ changeType: 'modified', filename: 'README.md' },
				]
			}
			if (compareCommitSha === 'deployed-search-worker-sha') {
				return []
			}
			if (compareCommitSha === 'deployed-audio-worker-sha') {
				return []
			}
			if (compareCommitSha === 'refresh-sha') {
				return []
			}
			if (compareCommitSha === 'push-before-sha') {
				return [{ changeType: 'modified', filename: 'README.md' }]
			}
			throw new Error(`Unexpected compare sha: ${compareCommitSha}`)
		},
	)
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		...defaultDeployPlanOpts,
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		fetchImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(false)
	expect(deployPlan.deploySearchWorker).toBe(false)
	expect(deployPlan.deployOauthWorker).toBe(true)
})

test('isolates site-staging from site-production', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const fetchImpl = createMockDeploymentFetch({
		'site-staging': 'staging-deployed-sha',
		'site-production': 'production-deployed-sha',
	})
	const getChangedFilesImpl = vi.fn(
		async (ignoredCurrentCommitSha, compareCommitSha) => {
			if (compareCommitSha === 'staging-deployed-sha') {
				return [{ changeType: 'modified', filename: 'services/site/app/routes/index.tsx' }]
			}
			if (compareCommitSha === 'production-deployed-sha') {
				return []
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
		...defaultDeployPlanOpts,
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		refName: 'dev',
		fetchJsonImpl,
		getChangedFilesImpl,
		fetchImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(true)
})

test('GitHub API failure defaults to deploy', async () => {
	const fetchJsonImpl = vi.fn(async (url) => {
		if (url.endsWith('/refresh-commit-sha.json')) {
			return { sha: 'refresh-sha' }
		}
		if (url.endsWith('/build/info.json')) {
			return { commit: { sha: 'fallback' } }
		}
		return null
	})
	const fetchImpl = vi.fn(async () => {
		throw new Error('Network error')
	})
	const getChangedFilesImpl = vi.fn(async () => [])
	const log = createLogger()

	const deployPlan = await computeDeployPlan({
		...defaultDeployPlanOpts,
		currentCommitSha: 'current-sha',
		pushBeforeSha: 'push-before-sha',
		eventName: 'push',
		fetchJsonImpl,
		getChangedFilesImpl,
		fetchImpl,
		log,
	})

	expect(deployPlan.deploySite).toBe(true)
	expect(deployPlan.deploySearchWorker).toBe(true)
	expect(deployPlan.deployCallKentAudioWorker).toBe(true)
	expect(deployPlan.deployOauthWorker).toBe(true)
})
