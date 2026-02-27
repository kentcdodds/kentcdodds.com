import { spawn, type ChildProcess } from 'node:child_process'
import net from 'node:net'
import getPort from 'get-port'

type MockService = {
	name: string
	color: string
	usesInspectorPort?: boolean
	command: (port: number, inspectorPort: number | null) => string
}

const mockServices: Array<MockService> = [
	{
		name: 'mock-kit',
		color: 'magenta',
		command: (port, inspectorPort) =>
			`bun ./wrangler-env.ts dev --local --config mock-servers/kit/wrangler.jsonc --port ${port} --inspector-port ${inspectorPort}`,
	},
	{
		name: 'mock-verifier',
		color: 'blue',
		command: (port, inspectorPort) =>
			`bun ./wrangler-env.ts dev --local --config mock-servers/verifier/wrangler.jsonc --port ${port} --inspector-port ${inspectorPort}`,
	},
	{
		name: 'mock-oauth',
		color: 'cyan',
		command: (port, inspectorPort) =>
			`bun ./wrangler-env.ts dev --local --config mock-servers/oauth/wrangler.jsonc --port ${port} --inspector-port ${inspectorPort}`,
	},
	{
		name: 'mock-mailgun',
		color: 'yellow',
		command: (port, inspectorPort) =>
			`bun ./wrangler-env.ts dev --local --config mock-servers/mailgun/wrangler.jsonc --port ${port} --inspector-port ${inspectorPort}`,
	},
	{
		name: 'mock-discord',
		color: 'red',
		command: (port, inspectorPort) =>
			`bun ./wrangler-env.ts dev --local --config mock-servers/discord/wrangler.jsonc --port ${port} --inspector-port ${inspectorPort}`,
	},
	{
		name: 'mock-simplecast',
		color: 'white',
		command: (port, inspectorPort) =>
			`bun ./wrangler-env.ts dev --local --config mock-servers/simplecast/wrangler.jsonc --port ${port} --inspector-port ${inspectorPort}`,
	},
	{
		name: 'mock-transistor',
		color: 'gray',
		command: (port, inspectorPort) =>
			`bun ./wrangler-env.ts dev --local --config mock-servers/transistor/wrangler.jsonc --port ${port} --inspector-port ${inspectorPort}`,
	},
	{
		name: 'mock-twitter',
		color: 'blue',
		command: (port, inspectorPort) =>
			`bun ./wrangler-env.ts dev --local --config mock-servers/twitter/wrangler.jsonc --port ${port} --inspector-port ${inspectorPort}`,
	},
	{
		name: 'mock-security',
		color: 'magenta',
		command: (port, inspectorPort) =>
			`bun ./wrangler-env.ts dev --local --config mock-servers/security/wrangler.jsonc --port ${port} --inspector-port ${inspectorPort}`,
	},
	{
		name: 'mock-oembed',
		color: 'cyan',
		command: (port, inspectorPort) =>
			`bun ./wrangler-env.ts dev --local --config mock-servers/oembed/wrangler.jsonc --port ${port} --inspector-port ${inspectorPort}`,
	},
	{
		name: 'mock-mermaid-to-svg',
		color: 'yellow',
		command: (port, inspectorPort) =>
			`bun ./wrangler-env.ts dev --local --config mock-servers/mermaid-to-svg/wrangler.jsonc --port ${port} --inspector-port ${inspectorPort}`,
	},
	{
		name: 'mock-cloudflare',
		color: 'green',
		command: (port, inspectorPort) =>
			`bun ./wrangler-env.ts dev --local --config mock-servers/cloudflare/wrangler.jsonc --port ${port} --inspector-port ${inspectorPort}`,
	},
	{
		name: 'mock-cloudflare-r2',
		color: 'white',
		usesInspectorPort: false,
		command: (port) =>
			`bun mock-servers/cloudflare-r2/local-server.ts --port ${port}`,
	},
	{
		name: 'mock-media-images',
		color: 'red',
		command: (port, inspectorPort) =>
			`bun ./wrangler-env.ts dev --local --config mock-servers/media-images/wrangler.jsonc --port ${port} --inspector-port ${inspectorPort}`,
	},
]

const preferredMockRangeStart = 8790
const mockRangeSearchEnd = 9490
const preferredAppPort = parsePort(process.env.PORT, 3000)
const appPort = await getPort({
	port: Array.from({ length: 25 }, (_unused, index) => preferredAppPort + index),
})
const mockRangeStart = await findAvailableRangeStart({
	preferredStart: preferredMockRangeStart,
	searchEnd: mockRangeSearchEnd,
	portCount: mockServices.length,
	services: mockServices,
})
const mockPorts = mockServices.map((_service, index) => mockRangeStart + index)
const getMockPort = (index: number) => {
	const port = mockPorts[index]
	if (typeof port !== 'number') {
		throw new Error(`Missing configured mock port at index ${index}.`)
	}
	return port
}

const kitPort = getMockPort(0)
const verifierPort = getMockPort(1)
const oauthPort = getMockPort(2)
const mailgunPort = getMockPort(3)
const discordPort = getMockPort(4)
const simplecastPort = getMockPort(5)
const transistorPort = getMockPort(6)
const twitterPort = getMockPort(7)
const securityPort = getMockPort(8)
const oembedPort = getMockPort(9)
const mermaidPort = getMockPort(10)
const cloudflarePort = getMockPort(11)
const r2Port = getMockPort(12)
const mediaPort = getMockPort(13)

const mockBase = (port: number) => `http://localhost:${port}`
const mediaBaseUrl = mockBase(mediaPort)
const cloudflareBaseUrl = mockBase(cloudflarePort)

if (appPort !== preferredAppPort) {
	console.warn(
		`⚠️  Port ${preferredAppPort} is busy. Starting app on ${appPort} instead.`,
	)
}
console.log(
	`🔌 Selected mock port range: ${mockRangeStart}-${mockRangeStart + mockServices.length - 1}`,
)
console.log(`🌐 App URL: http://localhost:${appPort}`)

const commands = [
	'bun run --silent dev:app',
	...mockServices.map((service, index) =>
		service.command(
			getMockPort(index),
			service.usesInspectorPort === false ? null : getMockPort(index) + 10_000,
		),
	),
	'bun run --silent content:watch-mdx-remote',
]
const names = ['app', ...mockServices.map((service) => service.name), 'content-watch']
const colors = ['green', ...mockServices.map((service) => service.color), 'magenta']

const runner = spawn(
	resolveBunxExecutable(),
	[
		'concurrently',
		'--kill-others-on-fail',
		'--names',
		names.join(','),
		'--prefix-colors',
		colors.join(','),
		...commands,
	],
	{
		stdio: ['inherit', 'inherit', 'inherit'],
		env: {
			...process.env,
			PORT: String(appPort),
			KIT_API_BASE_URL: mockBase(kitPort),
			VERIFIER_API_BASE_URL: mockBase(verifierPort),
			OAUTH_PROVIDER_BASE_URL: mockBase(oauthPort),
			MAILGUN_API_BASE_URL: mockBase(mailgunPort),
			DISCORD_API_BASE_URL: `${mockBase(discordPort)}/api`,
			SIMPLECAST_API_BASE_URL: mockBase(simplecastPort),
			TRANSISTOR_API_BASE_URL: mockBase(transistorPort),
			TWITTER_SYNDICATION_BASE_URL: mockBase(twitterPort),
			TWITTER_SHORTENER_BASE_URL: `${mockBase(twitterPort)}/short`,
			TWITTER_OEMBED_BASE_URL: mockBase(twitterPort),
			PWNED_PASSWORDS_API_BASE_URL: `${mockBase(securityPort)}/pwned`,
			GRAVATAR_BASE_URL: `${mockBase(securityPort)}/gravatar`,
			OEMBED_API_BASE_URL: mockBase(oembedPort),
			MERMAID_TO_SVG_BASE_URL: mockBase(mermaidPort),
			CLOUDFLARE_API_BASE_URL: `${cloudflareBaseUrl}/client/v4`,
			CLOUDFLARE_AI_GATEWAY_BASE_URL: `${cloudflareBaseUrl}/gateway/v1`,
			R2_ENDPOINT: mockBase(r2Port),
			MEDIA_BASE_URL: mediaBaseUrl,
			MEDIA_STREAM_BASE_URL: `${mediaBaseUrl}/stream`,
			MDX_REMOTE_SYNC_URL: `http://localhost:${appPort}/resources/mdx-remote-sync`,
			R2_MOCK_CACHE_DIRECTORY:
				process.env.R2_MOCK_CACHE_DIRECTORY ?? '.local/mock-r2-cache',
		},
	},
)

bindSignals(runner)
const exitCode = await waitForExit(runner)
process.exit(exitCode)

function resolveBunxExecutable() {
	return process.platform === 'win32' ? 'bunx.exe' : 'bunx'
}

function parsePort(value: string | undefined, fallback: number) {
	if (!value) return fallback
	const parsed = Number.parseInt(value, 10)
	return Number.isFinite(parsed) ? parsed : fallback
}

async function findAvailableRangeStart({
	preferredStart,
	searchEnd,
	portCount,
	services,
}: {
	preferredStart: number
	searchEnd: number
	portCount: number
	services: ReadonlyArray<MockService>
}) {
	for (let basePort = preferredStart; basePort <= searchEnd; basePort++) {
		const servicePorts = Array.from(
			{ length: portCount },
			(_unused, index) => basePort + index,
		)
		const inspectorPorts = services
			.map((service, index) =>
				service.usesInspectorPort === false ? null : basePort + index + 10_000,
			)
			.filter((port): port is number => typeof port === 'number')
		const rangePorts = [...servicePorts, ...inspectorPorts]
		const rangeAvailable = await arePortsAvailable(rangePorts)
		if (rangeAvailable) {
			return basePort
		}
	}
	throw new Error(
		`Unable to find ${portCount} contiguous free ports starting from ${preferredStart}.`,
	)
}

async function arePortsAvailable(ports: ReadonlyArray<number>) {
	for (const port of ports) {
		if (!(await isPortAvailable(port))) {
			return false
		}
	}
	return true
}

function isPortAvailable(port: number) {
	return new Promise<boolean>((resolve) => {
		const server = net.createServer()
		server.unref()
		server.on('error', () => {
			resolve(false)
		})
		server.listen(port, '127.0.0.1', () => {
			server.close(() => resolve(true))
		})
	})
}

function bindSignals(childProcess: ChildProcess) {
	let shuttingDown = false
	const terminate = (signal: NodeJS.Signals) => {
		if (shuttingDown) return
		shuttingDown = true
		if (childProcess.exitCode === null) {
			childProcess.kill(signal)
		}
	}
	process.on('SIGINT', () => terminate('SIGINT'))
	process.on('SIGTERM', () => terminate('SIGTERM'))
}

function waitForExit(childProcess: ChildProcess) {
	return new Promise<number>((resolve) => {
		childProcess.once('exit', (code, signal) => {
			if (typeof code === 'number') {
				resolve(code)
				return
			}
			if (signal === 'SIGINT' || signal === 'SIGTERM') {
				resolve(0)
				return
			}
			resolve(1)
		})
	})
}
