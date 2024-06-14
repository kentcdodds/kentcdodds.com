import 'dotenv/config'
import { installGlobals } from '@remix-run/node'
import chalk from 'chalk'
import closeWithGrace from 'close-with-grace'

// make sure globals are installed before we do anything else
// that way everything's referencing the same globals
installGlobals()

closeWithGrace(async ({ err }) => {
	if (err) {
		console.error(chalk.red(err))
		console.error(chalk.red(err.stack))
		process.exit(1)
	}
})

if (process.env.MOCKS === 'true') {
	await import('./mocks/index.ts')
}

if (process.env.NODE_ENV === 'production') {
	// this file may not exist if you haven't built yet, but it will
	// definitely exist by the time the prod server actually runs.

	await import('./server-build/index.js')
} else {
	await import('./server/index.ts')
}
