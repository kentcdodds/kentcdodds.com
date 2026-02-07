import os from 'os'
import chalk from 'chalk'

type StartupMessageOptions = {
	localUrl: string
	lanUrl?: string | null
	userName?: string
}

const supportedKeyLines = [
	`  ${chalk.green('o')} - open app`,
	`  ${chalk.cyan('c')} - copy url`,
	`  ${chalk.magenta('r')} - restart app`,
	`  ${chalk.yellow('h')} - help`,
	`  ${chalk.red('q')} - exit (or Ctrl+C)`,
]

const getOsUserName = () => {
	try {
		return os.userInfo().username
	} catch {
		return process.env.USER ?? process.env.LOGNAME ?? 'there'
	}
}

export const formatStartupMessage = ({
	localUrl,
	lanUrl,
	userName = getOsUserName(),
}: StartupMessageOptions) => {
	const urlLines = [
		`${chalk.bold('Local:')}            ${chalk.cyan(localUrl)}`,
		lanUrl ? `${chalk.bold('On Your Network:')}  ${chalk.cyan(lanUrl)}` : null,
		chalk.bold('Press Ctrl+C to stop'),
	]
		.filter(Boolean)
		.join('\n')

	return [
		`Welcome to kentcdodds.com, ${userName}!`,
		'Supported keys:',
		...supportedKeyLines,
		'It also supports hitting <enter> to add a newline to the output.',
		'',
		urlLines,
	].join('\n')
}
