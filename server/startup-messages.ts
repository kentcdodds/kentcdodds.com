import os from 'os'
import chalk from 'chalk'

type StartupMessageOptions = {
	localUrl: string
	lanUrl?: string | null
	userName?: string
}

const formatKeyLine = (
	key: string,
	label: string,
	color: (value: string) => string,
) => `  ${color(key)} - ${label}`

const supportedKeyLines = [
	formatKeyLine('o', 'open app', chalk.green),
	formatKeyLine('c', 'copy url', chalk.cyan),
	formatKeyLine('r', 'restart app', chalk.magenta),
	formatKeyLine('h', 'help', chalk.yellow),
	formatKeyLine('q', 'exit (or Ctrl+C)', chalk.red),
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
