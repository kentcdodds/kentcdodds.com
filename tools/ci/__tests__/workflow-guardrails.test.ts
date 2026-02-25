import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { parseDocument } from 'yaml'

function readWorkflow(workflowFileName: string) {
	const filePath = path.resolve(
		process.cwd(),
		'.github/workflows',
		workflowFileName,
	)
	const text = readFileSync(filePath, 'utf8')
	return parseDocument(text).toJS() as Record<string, unknown>
}

function getJob(
	workflow: Record<string, unknown>,
	jobName: string,
): Record<string, unknown> {
	const jobs = workflow.jobs as Record<string, unknown>
	expect(jobs).toBeTruthy()
	const job = jobs?.[jobName]
	expect(job).toBeTruthy()
	return (job ?? {}) as Record<string, unknown>
}

function getStepNames(job: Record<string, unknown>) {
	const steps = Array.isArray(job.steps)
		? (job.steps as Array<Record<string, unknown>>)
		: []
	return steps
		.map((step) => step.name)
		.filter((name): name is string => typeof name === 'string')
}

test('deploy workflow is gated by validate workflow_run completion', () => {
	const workflow = readWorkflow('deploy.yml')
	const on = workflow.on as Record<string, unknown>
	const workflowRun = on?.workflow_run as Record<string, unknown>

	expect(workflowRun).toBeTruthy()
	expect(workflowRun.workflows).toEqual(['✅ Validate'])
	expect(workflowRun.types).toEqual(['completed'])
})

test('deploy workflow preserves secrets -> migrations -> deploy -> healthcheck order', () => {
	const workflow = readWorkflow('deploy.yml')
	const deployJob = getJob(workflow, 'deploy')
	const stepNames = getStepNames(deployJob)

	const syncSecretsIndex = stepNames.indexOf('🔐 Sync Cloudflare secrets')
	const migrationsIndex = stepNames.indexOf('🗄️ Apply D1 migrations')
	const deployIndex = stepNames.indexOf('☁️ Deploy worker')
	const healthcheckIndex = stepNames.indexOf('🩺 Healthcheck')

	expect(syncSecretsIndex).toBeGreaterThanOrEqual(0)
	expect(migrationsIndex).toBeGreaterThan(syncSecretsIndex)
	expect(deployIndex).toBeGreaterThan(migrationsIndex)
	expect(healthcheckIndex).toBeGreaterThan(deployIndex)
})

test('preview workflow includes ensure and cleanup resource orchestration jobs', () => {
	const workflow = readWorkflow('preview.yml')
	const deployJob = getJob(workflow, 'deploy')
	const cleanupJob = getJob(workflow, 'cleanup')

	const deployStepNames = getStepNames(deployJob)
	const cleanupStepNames = getStepNames(cleanupJob)

	expect(deployStepNames).toContain('🧱 Ensure preview resources')
	expect(deployStepNames).toContain('☁️ Deploy preview app worker')
	expect(cleanupStepNames).toContain('🧹 Cleanup generated preview config')
})

test('preview deploy step applies d1 migrations before app worker deploy', () => {
	const workflow = readWorkflow('preview.yml')
	const deployJob = getJob(workflow, 'deploy')
	const steps = Array.isArray(deployJob.steps)
		? (deployJob.steps as Array<Record<string, unknown>>)
		: []
	const deployPreviewStep = steps.find(
		(step) => step.name === '☁️ Deploy preview app worker',
	)
	expect(deployPreviewStep).toBeTruthy()
	const runScript =
		typeof deployPreviewStep?.run === 'string' ? deployPreviewStep.run : ''

	const migrationIndex = runScript.indexOf(
		'bun run wrangler -- d1 migrations apply APP_DB',
	)
	const deployAfterMigrationIndex = runScript.indexOf(
		'bun run wrangler -- deploy --config',
		migrationIndex,
	)

	expect(migrationIndex).toBeGreaterThanOrEqual(0)
	expect(deployAfterMigrationIndex).toBeGreaterThan(migrationIndex)
})

test('validate workflow keeps baseline lint/typecheck/test/build jobs', () => {
	const workflow = readWorkflow('validate.yml')
	const jobs = workflow.jobs as Record<string, unknown>

	expect(jobs).toBeTruthy()
	expect(jobs).toHaveProperty('lint')
	expect(jobs).toHaveProperty('typecheck')
	expect(jobs).toHaveProperty('test-backend')
	expect(jobs).toHaveProperty('build')
})
