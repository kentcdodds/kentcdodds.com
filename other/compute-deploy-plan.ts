// try to keep this dep-free so we don't have to install deps
import fs from 'fs/promises'
import { pathToFileURL } from 'url'
import { fetchJson, getChangedFiles } from './get-changed-files.js'

const GITHUB_API_BASE = 'https://api.github.com'

const defaultBaseUrl =
	process.env.GITHUB_REF_NAME === 'dev'
		? 'https://kcd-staging.fly.dev'
		: 'https://kentcdodds.com'

const defaultFetchTimeoutMs = 10_000

const nonFlyDeployablePathPrefixes = [
	'services/site/content/',
	'services/call-kent-audio-worker/',
	'services/search-worker/',
	'services/oauth/',
]

const nonFlyDeployableFiles = new Set([
	'.github/workflows/deploy-call-kent-audio-worker.yml',
	'.github/workflows/deploy-search-worker.yml',
	'.github/workflows/deploy-oauth-worker.yml',
])

const semanticContentPathPrefixes = [
	'services/site/content/blog/',
	'services/site/content/pages/',
	'services/site/content/data/',
	'services/site/app/',
	'other/semantic-search/',
]

const callKentAudioWorkerPathPrefixes = ['services/call-kent-audio-worker/']
const callKentAudioWorkerFiles = new Set([
	'.github/workflows/deploy-call-kent-audio-worker.yml',
])

const searchWorkerPathPrefixes = [
	'services/search-worker/',
	'services/search-shared/',
]
const searchWorkerFiles = new Set(['.github/workflows/deploy-search-worker.yml'])

const oauthWorkerPathPrefixes = ['services/oauth/']
const oauthWorkerFiles = new Set(['.github/workflows/deploy-oauth-worker.yml'])

/**
 * GitHub deployment environment names per deploy target and ref.
 * Used to resolve last successful deployment SHA from GitHub Deployments API.
 */
const DEPLOY_ENVIRONMENTS: Record<string, (refName: string) => string | null> =
	{
		deploySite: (refName) =>
			refName === 'main'
				? 'site-production'
				: refName === 'dev'
					? 'site-staging'
					: null,
		deployOauthWorker: (refName) =>
			refName === 'main' ? 'oauth-production' : null,
		deployCallKentAudioWorker: (refName) =>
			refName === 'main' ? 'call-kent-audio-worker-production' : null,
		deploySearchWorker: (refName) =>
			refName === 'main' ? 'search-worker-production' : null,
	}

type ChangedFile = {
	changeType: string
	filename: string
}

type LogLike = Pick<typeof console, 'log' | 'warn'>

type GitHubDeployment = { id: number; sha: string }
type GitHubDeploymentStatus = { state: string }

async function fetchLastSuccessfulDeploymentSha({
	owner,
	repo,
	ref,
	environment,
	token,
	fetchImpl = fetch,
	timeoutMs = defaultFetchTimeoutMs,
	log = console,
}: {
	owner: string
	repo: string
	ref: string
	environment: string
	token: string | undefined
	fetchImpl?: typeof fetch
	timeoutMs?: number
	log?: LogLike
}): Promise<string | null> {
	if (!token) return null

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const deploymentsRes = await fetchImpl(
			`${GITHUB_API_BASE}/repos/${owner}/${repo}/deployments?environment=${encodeURIComponent(environment)}&ref=${encodeURIComponent(ref)}&per_page=10`,
			{
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${token}`,
					'X-GitHub-Api-Version': '2022-11-28',
				},
				signal: controller.signal,
			},
		)
		if (!deploymentsRes.ok) return null

		const deployments: Array<GitHubDeployment> = await deploymentsRes.json()
		for (const deployment of deployments) {
			const statusesRes = await fetchImpl(
				`${GITHUB_API_BASE}/repos/${owner}/${repo}/deployments/${deployment.id}/statuses?per_page=10`,
				{
					headers: {
						Accept: 'application/vnd.github+json',
						Authorization: `Bearer ${token}`,
						'X-GitHub-Api-Version': '2022-11-28',
					},
					signal: controller.signal,
				},
			)
			if (!statusesRes.ok) continue

			const statuses: Array<GitHubDeploymentStatus> = await statusesRes.json()
			const success = statuses.find((s) => s.state === 'success')
			if (success) return deployment.sha
		}
		return null
	} catch (error) {
		log.warn('GitHub deployment lookup failed, planning deploy.', {
			environment,
			error,
		})
		return null
	} finally {
		clearTimeout(timeout)
	}
}

async function getDeploymentChangedFiles({
	currentCommitSha,
	refName,
	target,
	owner,
	repo,
	token,
	fetchLastSuccessfulDeploymentShaImpl = fetchLastSuccessfulDeploymentSha,
	getChangedFilesImpl,
	fetchImpl,
	log,
}: {
	currentCommitSha: string
	refName: string
	target: keyof typeof DEPLOY_ENVIRONMENTS
	owner: string
	repo: string
	token: string | undefined
	fetchLastSuccessfulDeploymentShaImpl?: typeof fetchLastSuccessfulDeploymentSha
	getChangedFilesImpl: typeof getChangedFiles
	fetchImpl?: typeof fetch
	log: LogLike
}): Promise<{
	compareCommitSha: string | null
	changedFiles: null | Array<ChangedFile>
}> {
	const environment = DEPLOY_ENVIRONMENTS[target]?.(refName)
	if (!environment) {
		return { compareCommitSha: null, changedFiles: null }
	}

	const compareCommitSha = await fetchLastSuccessfulDeploymentShaImpl({
		owner,
		repo,
		ref: refName,
		environment,
		token,
		fetchImpl,
		log,
	})

	if (!compareCommitSha) {
		return { compareCommitSha: null, changedFiles: null }
	}

	const changedFiles = normalizeChangedFiles(
		await getChangedFilesImpl(currentCommitSha, compareCommitSha),
	)
	return { compareCommitSha, changedFiles }
}

function normalizeChangedFiles(changedFiles: null | Array<ChangedFile>) {
	if (!Array.isArray(changedFiles)) return changedFiles

	return changedFiles.map((file) => ({
		...file,
		filename: file.filename.replace(/\\/g, '/'),
	}))
}

function hasChangedPath(
	changedFiles: null | Array<ChangedFile>,
	predicate: (filename: string) => boolean,
) {
	return Array.isArray(changedFiles)
		? changedFiles.some((file) => predicate(file.filename))
		: false
}

function hasChangedPathPrefix(
	changedFiles: null | Array<ChangedFile>,
	pathPrefixes: Array<string>,
) {
	return hasChangedPath(changedFiles, (filename) =>
		pathPrefixes.some((prefix) => filename.startsWith(prefix)),
	)
}

function hasChangedExactFile(
	changedFiles: null | Array<ChangedFile>,
	files: Set<string>,
) {
	return hasChangedPath(changedFiles, (filename) => files.has(filename))
}

function isFlyDeployablePath(filename: string) {
	return (
		!nonFlyDeployablePathPrefixes.some((prefix) =>
			filename.startsWith(prefix),
		) && !nonFlyDeployableFiles.has(filename)
	)
}

function shouldDeploySite(changedFiles: null | Array<ChangedFile>) {
	if (changedFiles === null) return true
	if (changedFiles.length === 0) return false
	return changedFiles.some((file) => isFlyDeployablePath(file.filename))
}

function shouldRunPathTarget({
	changedFiles,
	pathPrefixes = [],
	files = new Set(),
	runWhenUnknown = false,
}: {
	changedFiles: null | Array<ChangedFile>
	pathPrefixes?: Array<string>
	files?: Set<string>
	runWhenUnknown?: boolean
}) {
	if (changedFiles === null) return runWhenUnknown

	return (
		hasChangedPathPrefix(changedFiles, pathPrefixes) ||
		hasChangedExactFile(changedFiles, files)
	)
}

function isAllZerosSha(sha: string | undefined | null) {
	return typeof sha === 'string' && /^0+$/.test(sha)
}

async function getRefreshChangedFiles({
	currentCommitSha,
	baseUrl,
	fetchJsonImpl,
	getChangedFilesImpl,
	log,
}: {
	currentCommitSha: string
	baseUrl: string
	fetchJsonImpl: typeof fetchJson
	getChangedFilesImpl: typeof getChangedFiles
	log: LogLike
}) {
	try {
		const shaInfo = await fetchJsonImpl(`${baseUrl}/refresh-commit-sha.json`, {
			timeoutTime: defaultFetchTimeoutMs,
		})
		let compareCommitSha = shaInfo?.sha

		if (!compareCommitSha) {
			const buildInfo = await fetchJsonImpl(`${baseUrl}/build/info.json`, {
				timeoutTime: defaultFetchTimeoutMs,
			})
			compareCommitSha = buildInfo?.commit?.sha
		}

		if (typeof compareCommitSha !== 'string') {
			log.warn(
				'Unable to determine refresh compare sha, skipping refresh planning.',
			)
			return { compareCommitSha: null, changedFiles: [] }
		}

		const changedFiles = normalizeChangedFiles(
			await getChangedFilesImpl(currentCommitSha, compareCommitSha),
		)

		return { compareCommitSha, changedFiles }
	} catch (error) {
		log.warn(
			'Unable to determine refresh plan from current site state, defaulting to refresh.',
			{ error },
		)
		return { compareCommitSha: null, changedFiles: null }
	}
}

async function getPushChangedFiles({
	currentCommitSha,
	pushBeforeSha,
	getChangedFilesImpl,
	isPushEvent,
	log,
}: {
	currentCommitSha: string
	pushBeforeSha: string | undefined | null
	getChangedFilesImpl: typeof getChangedFiles
	isPushEvent: boolean
	log: LogLike
}) {
	if (!isPushEvent) {
		return []
	}

	if (!pushBeforeSha || isAllZerosSha(pushBeforeSha)) {
		log.warn(
			'Push event did not provide a usable before sha. Planning conservatively.',
		)
		return null
	}

	return normalizeChangedFiles(
		await getChangedFilesImpl(currentCommitSha, pushBeforeSha),
	)
}

function parseRepo(
	repository: string | undefined,
): { owner: string; repo: string } | null {
	if (!repository || !repository.includes('/')) return null
	const [owner, repo] = repository.split('/', 2)
	return owner && repo ? { owner, repo } : null
}

export async function computeDeployPlan({
	currentCommitSha,
	pushBeforeSha = process.env.GITHUB_EVENT_BEFORE,
	baseUrl = defaultBaseUrl,
	eventName = process.env.GITHUB_EVENT_NAME,
	refName = process.env.GITHUB_BASE_REF ||
		process.env.GITHUB_REF_NAME ||
		'main',
	repository = process.env.GITHUB_REPOSITORY,
	token = process.env.GITHUB_TOKEN,
	fetchJsonImpl = fetchJson,
	getChangedFilesImpl = getChangedFiles,
	fetchImpl,
	log = console,
}: {
	currentCommitSha?: string
	pushBeforeSha?: string
	baseUrl?: string
	eventName?: string
	refName?: string
	repository?: string
	token?: string
	fetchJsonImpl?: typeof fetchJson
	getChangedFilesImpl?: typeof getChangedFiles
	fetchImpl?: typeof fetch
	log?: LogLike
} = {}) {
	if (!currentCommitSha) {
		throw new Error('currentCommitSha is required')
	}

	const isPushEvent = eventName === 'push'
	const repo = parseRepo(repository)

	const [
		pushChangedFiles,
		refreshResult,
		siteDeployResult,
		searchWorkerDeployResult,
		oauthDeployResult,
		audioWorkerDeployResult,
	] = await Promise.all([
		getPushChangedFiles({
			currentCommitSha,
			pushBeforeSha,
			getChangedFilesImpl,
			isPushEvent,
			log,
		}),
		getRefreshChangedFiles({
			currentCommitSha,
			baseUrl,
			fetchJsonImpl,
			getChangedFilesImpl,
			log,
		}),
		repo
			? getDeploymentChangedFiles({
					currentCommitSha,
					refName,
					target: 'deploySite',
					owner: repo.owner,
					repo: repo.repo,
					token,
					getChangedFilesImpl,
					fetchImpl,
					log,
				})
			: Promise.resolve({ compareCommitSha: null, changedFiles: null }),
		repo
			? getDeploymentChangedFiles({
					currentCommitSha,
					refName,
					target: 'deploySearchWorker',
					owner: repo.owner,
					repo: repo.repo,
					token,
					getChangedFilesImpl,
					fetchImpl,
					log,
				})
			: Promise.resolve({ compareCommitSha: null, changedFiles: null }),
		repo
			? getDeploymentChangedFiles({
					currentCommitSha,
					refName,
					target: 'deployOauthWorker',
					owner: repo.owner,
					repo: repo.repo,
					token,
					getChangedFilesImpl,
					fetchImpl,
					log,
				})
			: Promise.resolve({ compareCommitSha: null, changedFiles: null }),
		repo
			? getDeploymentChangedFiles({
					currentCommitSha,
					refName,
					target: 'deployCallKentAudioWorker',
					owner: repo.owner,
					repo: repo.repo,
					token,
					getChangedFilesImpl,
					fetchImpl,
					log,
				})
			: Promise.resolve({ compareCommitSha: null, changedFiles: null }),
	])

	const siteChangedFiles = siteDeployResult.changedFiles
	const {
		compareCommitSha: refreshCompareCommitSha,
		changedFiles: refreshChangedFiles,
	} = refreshResult

	const deployPlan = {
		deploySite: shouldDeploySite(siteChangedFiles),
		refreshContent: shouldRunPathTarget({
			changedFiles: refreshChangedFiles,
			pathPrefixes: ['services/site/content/'],
			runWhenUnknown: isPushEvent,
		}),
		indexSemanticContent: shouldRunPathTarget({
			changedFiles: pushChangedFiles,
			pathPrefixes: semanticContentPathPrefixes,
			runWhenUnknown: isPushEvent,
		}),
		deploySearchWorker: shouldRunPathTarget({
			changedFiles: searchWorkerDeployResult.changedFiles,
			pathPrefixes: searchWorkerPathPrefixes,
			files: searchWorkerFiles,
			runWhenUnknown: isPushEvent,
		}),
		deployCallKentAudioWorker: shouldRunPathTarget({
			changedFiles: audioWorkerDeployResult.changedFiles,
			pathPrefixes: callKentAudioWorkerPathPrefixes,
			files: callKentAudioWorkerFiles,
			runWhenUnknown: isPushEvent,
		}),
		deployOauthWorker: shouldRunPathTarget({
			changedFiles: oauthDeployResult.changedFiles,
			pathPrefixes: oauthWorkerPathPrefixes,
			files: oauthWorkerFiles,
			runWhenUnknown: isPushEvent,
		}),
	}

	log.log('Computed deploy plan.', {
		currentCommitSha,
		pushBeforeSha,
		siteCompareCommitSha: siteDeployResult.compareCommitSha,
		refreshCompareCommitSha,
		deployPlan,
	})

	return {
		...deployPlan,
		pushBeforeSha: pushBeforeSha ?? null,
		siteCompareCommitSha: siteDeployResult.compareCommitSha,
		refreshCompareCommitSha,
		pushChangedFiles,
		siteChangedFiles,
		refreshChangedFiles,
	}
}

export async function writeDeployPlanOutputs({
	deployPlan,
	outputFile = process.env.GITHUB_OUTPUT,
}: {
	deployPlan: Awaited<ReturnType<typeof computeDeployPlan>>
	outputFile?: string
}) {
	if (!outputFile) return

	const outputLines = [
		`deploy_site=${String(deployPlan.deploySite)}`,
		`refresh_content=${String(deployPlan.refreshContent)}`,
		`index_semantic_content=${String(deployPlan.indexSemanticContent)}`,
		`deploy_search_worker=${String(deployPlan.deploySearchWorker)}`,
		`deploy_call_kent_audio_worker=${String(
			deployPlan.deployCallKentAudioWorker,
		)}`,
		`deploy_oauth_worker=${String(deployPlan.deployOauthWorker)}`,
	]

	await fs.appendFile(outputFile, `${outputLines.join('\n')}\n`)
}

const isMainModule =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMainModule) {
	const [currentCommitSha] = process.argv.slice(2)
	void computeDeployPlan({ currentCommitSha })
		.then((deployPlan) => {
			return writeDeployPlanOutputs({ deployPlan })
		})
		.catch((error) => {
			console.error(error)
			process.exitCode = 1
		})
}
