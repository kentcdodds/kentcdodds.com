import fs from 'node:fs/promises'
import path from 'node:path'

const contentDirectories = ['blog', 'pages', 'writing-blog'] as const

type NormalizeOptions = {
	dryRun: boolean
}

type MovePlan = {
	sourceFile: string
	targetFile: string
}

function parseArgs(): NormalizeOptions {
	const args = new Set(process.argv.slice(2))
	return {
		dryRun: args.has('--dry-run'),
	}
}

async function fileExists(filePath: string) {
	try {
		await fs.access(filePath)
		return true
	} catch {
		return false
	}
}

async function collectMovePlans(): Promise<Array<MovePlan>> {
	const plans: Array<MovePlan> = []
	for (const contentDirectory of contentDirectories) {
		const absoluteDirectory = path.join('content', contentDirectory)
		const entries = await fs.readdir(absoluteDirectory, { withFileTypes: true })
		for (const entry of entries) {
			if (!entry.isFile() || !entry.name.endsWith('.mdx')) continue
			const slug = entry.name.replace(/\.mdx$/, '')
			const sourceFile = path.join(absoluteDirectory, entry.name)
			const targetFile = path.join(absoluteDirectory, slug, 'index.mdx')
			plans.push({ sourceFile, targetFile })
		}
	}
	return plans
}

async function executeMovePlans(
	plans: Array<MovePlan>,
	options: NormalizeOptions,
) {
	for (const plan of plans) {
		if (await fileExists(plan.targetFile)) {
			throw new Error(
				`Refusing to overwrite existing target file: ${plan.targetFile}`,
			)
		}
		const targetDirectory = path.dirname(plan.targetFile)
		if (options.dryRun) {
			console.log(`[dry-run] ${plan.sourceFile} -> ${plan.targetFile}`)
			continue
		}
		await fs.mkdir(targetDirectory, { recursive: true })
		await fs.rename(plan.sourceFile, plan.targetFile)
		console.log(`${plan.sourceFile} -> ${plan.targetFile}`)
	}
}

async function main() {
	const options = parseArgs()
	const plans = await collectMovePlans()
	if (!plans.length) {
		console.log('No flat MDX files found. Content layout already normalized.')
		return
	}

	console.log(
		`${options.dryRun ? '[dry-run] ' : ''}normalizing ${plans.length} mdx files`,
	)
	await executeMovePlans(plans, options)
	console.log(
		`${options.dryRun ? '[dry-run] ' : ''}completed mdx layout normalization`,
	)
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
