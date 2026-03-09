// try to keep this dep-free so we don't have to install deps
import { getChangedFiles, fetchJson } from './get-changed-files.js'
const [currentCommitSha] = process.argv.slice(2)

const nonFlyDeployablePathPrefixes = [
	'content/',
	'call-kent-audio-worker/',
	'call-kent-audio-container/',
]

const nonFlyDeployableFiles = new Set([
	'.github/workflows/deploy-call-kent-audio-worker.yml',
	'.github/workflows/deploy-call-kent-audio-container.yml',
])

function isFlyDeployablePath(filename) {
	return (
		!nonFlyDeployablePathPrefixes.some((prefix) => filename.startsWith(prefix)) &&
		!nonFlyDeployableFiles.has(filename)
	)
}

const baseUrl =
	process.env.GITHUB_REF_NAME === 'dev'
		? 'https://kcd-staging.fly.dev'
		: 'https://kentcdodds.com'

async function go() {
	const buildInfo = await fetchJson(`${baseUrl}/build/info.json`, {
		timoutTime: 10_000,
	})
	const compareCommitSha = buildInfo.commit.sha
	const changedFiles = await getChangedFiles(currentCommitSha, compareCommitSha)
	console.error('Determining whether the changed files are deployable', {
		currentCommitSha,
		compareCommitSha,
		changedFiles,
	})
	// Fly deploy if:
	// - there was an error getting the changed files (null)
	// - there are no changed files
	// - there are changed files, and at least one of them affects the Fly app
	const isDeployable =
		changedFiles === null ||
		changedFiles.length === 0 ||
		changedFiles.some(({ filename }) => isFlyDeployablePath(filename))

	console.error(
		isDeployable
			? '🟢 There are deployable changes'
			: '🔴 No deployable changes',
		{ isDeployable },
	)
	console.log(isDeployable)
}

go().catch((e) => {
	console.error(e)
	console.log('true')
})
