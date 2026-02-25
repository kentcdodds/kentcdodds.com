// try to keep this dep-free so we don't have to install deps
import { pathToFileURL } from 'url'
import { getChangedFiles, fetchJson } from './get-changed-files.js'
import { postRefreshCache } from './utils.js'

const defaultBaseUrl =
	process.env.REFRESH_CONTENT_BASE_URL ||
	(process.env.GITHUB_REF_NAME === 'dev'
		? 'https://kentcdodds-com-development.workers.dev'
		: 'https://kentcdodds.com')

const defaultFetchTimeoutMs = 10_000

const defaultRefreshRetryOptions = {
	maxAttempts: 3,
	baseDelayMs: 2_000,
}

export function getErrorMessage(error) {
	if (error instanceof Error) {
		return error.message
	}
	if (typeof error === 'string') {
		return error
	}
	try {
		const serialized = JSON.stringify(error)
		if (typeof serialized === 'string') {
			return serialized
		}
		return String(error)
	} catch {
		return String(error)
	}
}

const sleep = (durationMs) =>
	new Promise((resolve) => {
		const timer = setTimeout(resolve, durationMs)
		if (typeof timer?.unref === 'function') {
			timer.unref()
		}
	})

async function postRefreshCacheWithRetry({
	postRefreshCacheImpl,
	postData,
	log,
	maxAttempts = defaultRefreshRetryOptions.maxAttempts,
	baseDelayMs = defaultRefreshRetryOptions.baseDelayMs,
}) {
	let lastError = null
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const response = await postRefreshCacheImpl({ postData })
			return { ok: true, attempts: attempt, response }
		} catch (error) {
			lastError = error
			if (attempt === maxAttempts) {
				break
			}
			const retryDelayMs = baseDelayMs * attempt
			log.warn(
				`Refresh cache request failed on attempt ${attempt}/${maxAttempts}. Retrying in ${retryDelayMs}ms.`,
				{ error: getErrorMessage(error) },
			)
			await sleep(retryDelayMs)
		}
	}

	return {
		ok: false,
		attempts: maxAttempts,
		error: lastError,
	}
}

export async function refreshChangedContent({
	currentCommitSha,
	baseUrl = defaultBaseUrl,
	fetchJsonImpl = fetchJson,
	getChangedFilesImpl = getChangedFiles,
	postRefreshCacheImpl = postRefreshCache,
	log = console,
	maxRefreshAttempts = defaultRefreshRetryOptions.maxAttempts,
	retryDelayMs = defaultRefreshRetryOptions.baseDelayMs,
} = {}) {
	if (!currentCommitSha) {
		throw new Error('currentCommitSha is required')
	}

	const shaInfo = await fetchJsonImpl(`${baseUrl}/refresh-commit-sha.json`, {
		timeoutTime: defaultFetchTimeoutMs,
	})
	let compareSha = shaInfo?.sha
	if (!compareSha) {
		const buildInfo = await fetchJsonImpl(`${baseUrl}/build/info.json`, {
			timeoutTime: defaultFetchTimeoutMs,
		})
		compareSha = buildInfo?.commit?.sha
		log.log(`No compare sha found, using build sha: ${compareSha}`)
	}
	if (typeof compareSha !== 'string') {
		log.log('🤷‍♂️ No sha to compare to. Unsure what to refresh.')
		return { status: 'no-compare-sha' }
	}

	const changedFiles =
		(await getChangedFilesImpl(currentCommitSha, compareSha)) ?? []
	const contentPaths = changedFiles
		.filter((f) => f.filename.startsWith('content'))
		.map((f) => f.filename.replace(/^content\//, ''))
	if (!contentPaths.length) {
		log.log('🆗 Not refreshing changed content because no content changed.')
		return { status: 'no-content-changes' }
	}

	log.log(`⚡️ Content changed. Requesting the cache be refreshed.`, {
		currentCommitSha,
		compareSha,
		contentPaths,
	})
	const refreshResult = await postRefreshCacheWithRetry({
		postRefreshCacheImpl,
		postData: {
			contentPaths,
			commitSha: currentCommitSha,
		},
		log,
		maxAttempts: maxRefreshAttempts,
		baseDelayMs: retryDelayMs,
	})

	if (refreshResult.ok) {
		log.log(`Content change request finished.`, {
			response: refreshResult.response,
			attempts: refreshResult.attempts,
		})
		return {
			status: 'refreshed',
			attempts: refreshResult.attempts,
		}
	}

	log.warn(
		'⚠️ Content changed but cache refresh failed. Continuing without failing this workflow run.',
		{
			currentCommitSha,
			compareSha,
			contentPaths,
			attempts: refreshResult.attempts,
			error: getErrorMessage(refreshResult.error),
		},
	)
	return {
		status: 'refresh-failed',
		attempts: refreshResult.attempts,
	}
}

const isMainModule =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMainModule) {
	const [currentCommitSha] = process.argv.slice(2)
	void refreshChangedContent({ currentCommitSha }).catch((error) => {
		console.error('Unexpected error while refreshing changed content.', {
			error: getErrorMessage(error),
		})
		process.exitCode = 1
	})
}
