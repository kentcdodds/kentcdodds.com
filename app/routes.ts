import { autoRoutes } from 'react-router-auto-routes'

export default autoRoutes({
	ignoredRouteFiles: [
		'**/.*',
		'**/*.css',
		'**/*.test.{js,jsx,ts,tsx}',
		'**/__*.*',
	],
})
