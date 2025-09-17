import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const commit = process.env.COMMIT_SHA

async function getCommit() {
	if (!commit) return `No COMMIT_SHA environment variable set.`
	try {
		const res = await fetch(
			`https://api.github.com/repos/kentcdodds/kentcdodds.com/commits/${commit}`,
		)
		const data = await res.json()
		return {
			isDeployCommit: commit === 'HEAD' ? 'Unknown' : true,
			sha: data.sha,
			author: data.commit.author.name,
			date: data.commit.author.date,
			message: data.commit.message,
			link: data.html_url,
		}
	} catch (error) {
		return `Unable to get git commit info: ${error.message}`
	}
}

const buildInfo = {
	buildTime: Date.now(),
	commit: await getCommit(),
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const destDir = path.join(__dirname, '../build/client/build')
if (!fs.existsSync(destDir)) {
	fs.mkdirSync(destDir, { recursive: true })
}
fs.writeFileSync(
	path.join(destDir, 'info.json'),
	JSON.stringify(buildInfo, null, 2),
)
console.log('build info generated', buildInfo)
