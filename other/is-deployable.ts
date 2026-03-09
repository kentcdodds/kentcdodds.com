// try to keep this dep-free so we don't have to install deps
import { computeDeployPlan } from './compute-deploy-plan.ts'

const [currentCommitSha] = process.argv.slice(2)

async function go() {
	const deployPlan = await computeDeployPlan({ currentCommitSha })
	const isDeployable = deployPlan.deploySite

	console.error(
		isDeployable
			? '🟢 There are deployable changes'
			: '🔴 No deployable changes',
		{ isDeployable },
	)
	console.log(isDeployable)
}

go().catch((error) => {
	console.error(error)
	console.log('true')
})
