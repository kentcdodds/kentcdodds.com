import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

// The Playwright *test runner* imports server modules (see `e2e/utils.ts`), and
// those modules now validate env via `getEnv()`. Ensure `NODE_ENV` is always a
// valid value for the runner process.
if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = process.env.CI ? 'test' : 'development'
}

const PORT = Number(process.env.PORT || 3000)

if (!PORT) {
	throw new Error(`PORT environment variable is required`)
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: './e2e',
	/* Maximum time one test can run for. */
	timeout: 30 * 1000,
	expect: {
		/**
		 * Maximum time expect() should wait for the condition to be met.
		 * For example in `await expect(locator).toHaveText();`
		 */
		timeout: 5000,
	},
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : undefined,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: 'html',
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
		actionTimeout: 0,
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: `http://localhost:${PORT}`,

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',
	},

	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				launchOptions: {
					args: [
						'--allow-file-access-from-files',
						'--use-fake-ui-for-media-stream',
						'--use-fake-device-for-media-stream',
						'--use-file-for-fake-audio-capture=tests/sample.wav',
					],
				},
			},
		},
	],

	/* Folder for test artifacts such as screenshots, videos, traces, etc. */
	outputDir: 'test-results/',
	webServer: {
		command: `cross-env PORT=${PORT} PLAYWRIGHT_TEST_BASE_URL=http://localhost:${PORT} bun run dev`,
		port: Number(PORT),
		// Default to a clean, deterministic server per run.
		// Set `PW_REUSE_EXISTING_SERVER=true` to opt into reuse locally.
		reuseExistingServer: process.env.PW_REUSE_EXISTING_SERVER === 'true',
	},
})
