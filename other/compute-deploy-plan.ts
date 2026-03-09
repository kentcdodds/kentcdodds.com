// try to keep this dep-free so we don't have to install deps
import fs from 'fs/promises'
import { pathToFileURL } from 'url'
import { fetchJson, getChangedFiles } from './get-changed-files.js'

const defaultBaseUrl =
	process.env.GITHUB_REF_NAME === 'dev'
		? 'https://kcd-staging.fly.dev'
		: 'https://kentcdodds.com'

const defaultFetchTimeoutMs = 10_000

const nonFlyDeployablePathPrefixes = [
	'content/',
	'call-kent-audio-worker/',
	'call-kent-audio-container/',
]

const nonFlyDeployableFiles = new Set([
	'.github/workflows/deploy-call-kent-audio-worker.yml',
	'.github/workflows/deploy-call-kent-audio-container.yml',
])

const semanticContentPathPrefixes = [
	'content/blog/',
	'content/pages/',
	'content/data/',
	'app/',
	'other/semantic-search/',
]

const callKentAudioWorkerPathPrefixes = ['call-kent-audio-worker/']
const callKentAudioWorkerFiles = new Set([
	'.github/workflows/deploy-call-kent-audio-worker.yml',
])

const callKentAudioContainerPathPrefixes = ['call-kent-audio-container/']
const callKentAudioContainerFiles = new Set([
	'.github/workflows/deploy-call-kent-audio-container.yml',
])

type ChangedFile = {
	changeType: string
	filename: string
}

type LogLike = Pick<typeof console, 'log' | 'warn'>

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
	return (
		changedFiles === null ||
		changedFiles.length === 0 ||
		changedFiles.some((file) => isFlyDeployablePath(file.filename))
	)
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

async function getSiteChangedFiles({
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
		const buildInfo = await fetchJsonImpl(`${baseUrl}/build/info.json`, {
			timeoutTime: defaultFetchTimeoutMs,
		})
		const compareCommitSha = buildInfo?.commit?.sha
		if (typeof compareCommitSha !== 'string') {
			log.warn(
				'Unable to determine deployed build sha for site deploy planning.',
			)
			return { compareCommitSha: null, changedFiles: null }
		}

		const changedFiles = normalizeChangedFiles(
			await getChangedFilesImpl(currentCommitSha, compareCommitSha),
		)

		return { compareCommitSha, changedFiles }
	} catch (error) {
		log.warn('Unable to determine site deploy plan, defaulting to deploy.', {
			error,
		})
		return { compareCommitSha: null, changedFiles: null }
	}
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

export async function computeDeployPlan({
	currentCommitSha,
	pushBeforeSha = process.env.GITHUB_EVENT_BEFORE,
	baseUrl = defaultBaseUrl,
	eventName = process.env.GITHUB_EVENT_NAME,
	fetchJsonImpl = fetchJson,
	getChangedFilesImpl = getChangedFiles,
	log = console,
}: {
	currentCommitSha?: string
	pushBeforeSha?: string
	baseUrl?: string
	eventName?: string
	fetchJsonImpl?: typeof fetchJson
	getChangedFilesImpl?: typeof getChangedFiles
	log?: LogLike
} = {}) {
	if (!currentCommitSha) {
		throw new Error('currentCommitSha is required')
	}

	const isPushEvent = eventName === 'push'
	const pushChangedFiles = await getPushChangedFiles({
		currentCommitSha,
		pushBeforeSha,
		getChangedFilesImpl,
		isPushEvent,
		log,
	})

	const [
		{ compareCommitSha: siteCompareCommitSha, changedFiles: siteChangedFiles },
		{
			compareCommitSha: refreshCompareCommitSha,
			changedFiles: refreshChangedFiles,
		},
	] = await Promise.all([
		getSiteChangedFiles({
			currentCommitSha,
			baseUrl,
			fetchJsonImpl,
			getChangedFilesImpl,
			log,
		}),
		getRefreshChangedFiles({
			currentCommitSha,
			baseUrl,
			fetchJsonImpl,
			getChangedFilesImpl,
			log,
		}),
	])

	const deployPlan = {
		deploySite: shouldDeploySite(siteChangedFiles),
		refreshContent: shouldRunPathTarget({
			changedFiles: refreshChangedFiles,
			pathPrefixes: ['content/'],
			runWhenUnknown: isPushEvent,
		}),
		indexSemanticContent: shouldRunPathTarget({
			changedFiles: pushChangedFiles,
			pathPrefixes: semanticContentPathPrefixes,
			runWhenUnknown: isPushEvent,
		}),
		deployCallKentAudioWorker: shouldRunPathTarget({
			changedFiles: pushChangedFiles,
			pathPrefixes: callKentAudioWorkerPathPrefixes,
			files: callKentAudioWorkerFiles,
			runWhenUnknown: isPushEvent,
		}),
		deployCallKentAudioContainer: shouldRunPathTarget({
			changedFiles: pushChangedFiles,
			pathPrefixes: callKentAudioContainerPathPrefixes,
			files: callKentAudioContainerFiles,
			runWhenUnknown: isPushEvent,
		}),
	}

	log.log('Computed deploy plan.', {
		currentCommitSha,
		pushBeforeSha,
		siteCompareCommitSha,
		refreshCompareCommitSha,
		deployPlan,
	})

	return {
		...deployPlan,
		pushBeforeSha: pushBeforeSha ?? null,
		siteCompareCommitSha,
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
		`deploy_call_kent_audio_worker=${String(
			deployPlan.deployCallKentAudioWorker,
		)}`,
		`deploy_call_kent_audio_container=${String(
			deployPlan.deployCallKentAudioContainer,
		)}`,
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
