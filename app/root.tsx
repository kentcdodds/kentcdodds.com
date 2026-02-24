import { HotkeysProvider } from '@tanstack/react-hotkeys'

import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import * as React from 'react'
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLocation,
	useNavigation,
	data as json,
	type HeadersFunction,
	type LinksFunction,
	type MetaFunction,
} from 'react-router'
import { useSpinDelay } from 'spin-delay'
import { type KCDHandle } from '#app/types.ts'
import { getInstanceInfo } from '#app/utils/litefs-js.server.ts'
import {
	useCapturedRouteError,
	getDisplayUrl,
	getDomainUrl,
	getUrl,
	removeTrailingSlash,
} from '#app/utils/misc-react.tsx'
import { type Route } from './+types/root'
import { AppHotkeys } from './components/app-hotkeys.tsx'
import { ArrowLink } from './components/arrow-button.tsx'
import { ErrorPage, FourHundred, FourOhFour } from './components/errors.tsx'
import { Footer } from './components/footer.tsx'
import { Grimmacing } from './components/kifs.tsx'
import { Navbar } from './components/navbar.tsx'
import { NotificationMessage } from './components/notification-message.tsx'
import { Spacer } from './components/spacer.tsx'
import { TeamCircle } from './components/team-circle.tsx'
import { getGenericSocialImage, illustrationImages, images } from './images.tsx'
import appStyles from './styles/app.css?url'
import noScriptStyles from './styles/no-script.css?url'
import proseStyles from './styles/prose.css?url'
import tailwindStyles from './styles/tailwind.css?url'
import vendorStyles from './styles/vendors.css?url'
import { ClientHintCheck, getHints } from './utils/client-hints.tsx'
import { getClientSession } from './utils/client.server.ts'
import { getPublicEnv } from './utils/env.server.ts'
import { getLoginInfoSession } from './utils/login.server.ts'
import { useNonce } from './utils/nonce-provider.ts'
import { getLatestPodcastSeasonLinks } from './utils/podcast-latest-season.server.ts'
import { getSocialMetas } from './utils/seo.ts'
import { getSession } from './utils/session.server.ts'
import { TeamProvider, useTeam } from './utils/team-provider.tsx'
import { getTheme } from './utils/theme.server.ts'
import { useTheme } from './utils/theme.tsx'
import { getServerTimeHeader, time, withTimeout } from './utils/timing.server.ts'
import { getUserInfo } from './utils/user-info.server.ts'

export const handle: KCDHandle & { id: string } = {
	id: 'root',
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	const requestInfo = data?.requestInfo
	const title = 'Kent C. Dodds'
	const description =
		'Come check out how Kent C. Dodds can help you level up your career as a software engineer.'
	return [
		{ viewport: 'width=device-width,initial-scale=1,viewport-fit=cover' },
		{
			'theme-color':
				requestInfo?.userPrefs.theme === 'dark' ? '#1F2028' : '#FFF',
		},
		...getSocialMetas({
			keywords:
				'Learn React, Testing JavaScript Training, React Training, Learn JavaScript, Learn TypeScript',
			url: getUrl(requestInfo),
			image: getGenericSocialImage({
				url: getDisplayUrl(requestInfo),
				words:
					'Helping people make the world a better place through quality software.',
				featuredImage: 'kentcdodds.com/illustrations/kody-flying_blue',
			}),
			title,
			description,
		}),
	]
}

export const links: LinksFunction = () => {
	return [
		{
			rel: 'apple-touch-icon',
			sizes: '180x180',
			href: '/favicons/apple-touch-icon.png',
		},
		{
			rel: 'icon',
			type: 'image/png',
			sizes: '32x32',
			href: '/favicons/favicon-32x32.png',
		},
		{
			rel: 'icon',
			type: 'image/png',
			sizes: '16x16',
			href: '/favicons/favicon-16x16.png',
		},
		{ rel: 'manifest', href: '/site.webmanifest' },
		{ rel: 'icon', href: '/favicon.ico' },
		{ rel: 'stylesheet', href: vendorStyles },
		{ rel: 'stylesheet', href: tailwindStyles },
		{ rel: 'stylesheet', href: proseStyles },
		{ rel: 'stylesheet', href: appStyles },
	]
}

const PODCAST_LINKS_FALLBACK = {
	chats: { latestSeasonNumber: null, latestSeasonPath: '/chats' },
	calls: { latestSeasonNumber: null, latestSeasonPath: '/calls' },
} as const

export async function loader({ request }: Route.LoaderArgs) {
	const timings = {}
	const loaderStart = performance.now()
	const session = await getSession(request)
	const [
		user,
		clientSession,
		loginInfoSession,
		primaryInstance,
		latestPodcastSeasonLinks,
	] = await Promise.all([
		session.getUser({ timings }),
		getClientSession(request, session.getUser({ timings })),
		getLoginInfoSession(request),
		getInstanceInfo().then((i) => i.primaryInstance),
		time(
			withTimeout(
				getLatestPodcastSeasonLinks({ request, timings }).catch(
					() => PODCAST_LINKS_FALLBACK,
				),
				{
					timeoutMs: 2000,
					fallback: PODCAST_LINKS_FALLBACK,
					label: 'root:podcast-season-links',
				},
			),
			{
				timings,
				type: 'root:podcast-season-links',
				desc: 'podcast nav links (Simplecast + Transistor)',
			},
		),
	])

	const randomFooterImageKeys = Object.keys(illustrationImages)
	const randomFooterImageKey = randomFooterImageKeys[
		Math.floor(Math.random() * randomFooterImageKeys.length)
	] as keyof typeof illustrationImages

	const data = {
		user,
		userInfo: user ? await getUserInfo(user, { request, timings }) : null,
		latestPodcastSeasonLinks,
		ENV: getPublicEnv(),
		randomFooterImageKey,
		requestInfo: {
			hints: getHints(request),
			origin: getDomainUrl(request),
			path: new URL(request.url).pathname,
			flyPrimaryInstance: primaryInstance,
			userPrefs: {
				theme: getTheme(request),
			},
			session: {
				email: loginInfoSession.getEmail(),
				signupEmail: loginInfoSession.getSignupEmail(),
			},
		},
	}

	const headers: HeadersInit = new Headers()
	// this can lead to race conditions if a child route is also trying to commit
	// the cookie as well. This is a bug in remix that will hopefully be fixed.
	// we reduce the likelihood of a problem by only committing if the value is
	// different.
	await session.getHeaders(headers)
	await clientSession.getHeaders(headers)
	await loginInfoSession.getHeaders(headers)
	// Add root loader total for production diagnostics (visible in Server-Timing)
	const rootLoaderTotal = performance.now() - loaderStart
	const rootTimings = {
		...timings,
		'root:loader': [
			{ type: 'root:loader', desc: 'root loader total', time: rootLoaderTotal },
		],
	}
	headers.append('Server-Timing', getServerTimeHeader(rootTimings))

	return json(data, { headers })
}

export type RootLoaderType = typeof loader

export const headers: HeadersFunction = ({ loaderHeaders }) => {
	return {
		'Server-Timing': loaderHeaders.get('Server-Timing') ?? '',
	}
}

const LOADER_WORDS = [
	'loading',
	'checking cdn',
	'checking cache',
	'fetching from db',
	'compiling mdx',
	'updating cache',
	'transfer',
]

const ACTION_WORDS = [
	'packaging',
	'zapping',
	'validating',
	'processing',
	'calculating',
	'computing',
	'computering',
]

// we don't want to show the loading indicator on page load
let firstRender = true

function PageLoadingMessage() {
	const navigation = useNavigation()
	const [words, setWords] = React.useState<Array<string>>([])
	const [pendingPath, setPendingPath] = React.useState('')
	const showLoader = useSpinDelay(Boolean(navigation.state !== 'idle'), {
		delay: 400,
		minDuration: 1000,
	})

	React.useEffect(() => {
		if (firstRender) return
		if (navigation.state === 'idle') return
		if (navigation.state === 'loading') setWords(LOADER_WORDS)
		if (navigation.state === 'submitting') setWords(ACTION_WORDS)

		const interval = setInterval(() => {
			setWords(([first, ...rest]) => [...rest, first] as Array<string>)
		}, 2000)

		return () => clearInterval(interval)
	}, [pendingPath, navigation.state])

	React.useEffect(() => {
		if (firstRender) return
		if (navigation.state === 'idle') return
		setPendingPath(navigation.location.pathname)
	}, [navigation])

	React.useEffect(() => {
		firstRender = false
	}, [])

	const action = words[0]

	return (
		<NotificationMessage position="bottom-right" visible={showLoader}>
			<div className="flex w-64 items-center">
				<motion.div
					transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
					animate={{ rotate: 360 }}
				>
					<TeamCircle size={48} team="UNKNOWN" />
				</motion.div>
				<div className="ml-4 inline-grid">
					<AnimatePresence>
						<div className="col-start-1 row-start-1 flex overflow-hidden">
							<motion.span
								key={action}
								initial={{ y: 15, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								exit={{ y: -15, opacity: 0 }}
								transition={{ duration: 0.25 }}
								className="flex-none"
							>
								{action}
							</motion.span>
						</div>
					</AnimatePresence>
					<span className="text-secondary truncate">path: {pendingPath}</span>
				</div>
			</div>
		</NotificationMessage>
	)
}

declare global {
	interface Window {
		fathom:
			| {
					trackPageview(): void
			  }
			| undefined
	}
}

type FathomQueue = Array<{ command: 'trackPageview' }>

function CanonicalLink({
	origin,
	fathomQueue,
}: {
	origin: string
	fathomQueue: React.MutableRefObject<FathomQueue>
}) {
	const { pathname } = useLocation()
	const canonicalUrl = removeTrailingSlash(`${origin}${pathname}`)

	React.useEffect(() => {
		if (window.fathom) {
			window.fathom.trackPageview()
		} else {
			// Fathom hasn't finished loading yet! queue the command
			fathomQueue.current.push({ command: 'trackPageview' })
		}
		// Fathom looks uses the canonical URL to track visits, so we're using it
		// as a dependency even though we're not using it explicitly
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canonicalUrl])

	return <link rel="canonical" href={canonicalUrl} />
}

function App({
	loaderData: data,
}: {
	loaderData: Route.ComponentProps['loaderData']
}) {
	const nonce = useNonce()
	const [team] = useTeam()
	const theme = useTheme()
	const fathomQueue = React.useRef<FathomQueue>([])
	return (
		<html
			lang="en"
			className={clsx(theme, `set-color-team-current-${team.toLowerCase()}`)}
		>
			<head>
				<script
					nonce={nonce}
					suppressHydrationWarning
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(data.ENV)};`,
					}}
				/>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta
					name="viewport"
					content="width=device-width,initial-scale=1,viewport-fit=cover"
				/>

				<CanonicalLink
					origin={data.requestInfo.origin}
					fathomQueue={fathomQueue}
				/>

				<Links />
				<noscript>
					<link rel="stylesheet" href={noScriptStyles} />
				</noscript>
			</head>
			<body className="bg-white transition duration-500 dark:bg-gray-900">
				<PageLoadingMessage />
				<NotificationMessage queryStringKey="message" delay={0.3} />
				<Navbar />
				<AppHotkeys />
				<Outlet />
				<Spacer size="base" />
				<Footer image={images[data.randomFooterImageKey]} />
				<ScrollRestoration nonce={nonce} />
				{ENV.MODE === 'development' ? null : (
					<script
						nonce={nonce}
						src="https://cdn.usefathom.com/script.js"
						data-site="HJUUDKMT"
						data-spa="history"
						data-auto="false" // prevent tracking visit twice on initial page load
						data-excluded-domains="localhost"
						defer
						onLoad={() => {
							fathomQueue.current.forEach(({ command }) => {
								if (window.fathom) {
									window.fathom[command]()
								} else {
									// Fathom isn't available even though the script has loaded
									// this should never happen!
								}
							})
							fathomQueue.current = []
						}}
					/>
				)}
				<Scripts nonce={nonce} />
				{ENV.MODE === 'development' ? (
					<script
						nonce={nonce}
						suppressHydrationWarning
						dangerouslySetInnerHTML={{ __html: getWebsocketJS() }}
					/>
				) : null}
			</body>
		</html>
	)
}

function AppWithProviders({ loaderData }: Route.ComponentProps) {
	return (
		<TeamProvider>
			<HotkeysProvider>
				<App loaderData={loaderData} />
			</HotkeysProvider>
		</TeamProvider>
	)
}
export default AppWithProviders

function ErrorDoc({ children }: { children: React.ReactNode }) {
	const nonce = useNonce()
	return (
		<html lang="en" className="dark">
			<head>
				<title>Oh no...</title>
				<script
					nonce={nonce}
					suppressHydrationWarning
					dangerouslySetInnerHTML={{
						__html: `window.ENV = {}`,
					}}
				/>
				<Links />
			</head>
			<body className="bg-white transition duration-500 dark:bg-gray-900">
				{children}
				<Scripts nonce={nonce} />
			</body>
		</html>
	)
}

// best effort, last ditch error boundary. This should only catch root errors
// all other errors should be caught by the index route which will include
// the footer and stuff, which is much better.
export function ErrorBoundary() {
	const error = useCapturedRouteError()
	const location = useLocation()

	if (isRouteErrorResponse(error)) {
		console.error('CatchBoundary', error)
		if (error.status === 404) {
			return (
				<ErrorDoc>
					<FourOhFour pathname={location.pathname} />
				</ErrorDoc>
			)
		}
		if (error.status === 400) {
			return (
				<ErrorDoc>
					<FourHundred error={error.data} />
				</ErrorDoc>
			)
		}
		if (error.status === 409) {
			return (
				<ErrorDoc>
					<ErrorPage
						heroProps={{
							title: '409 - Oh no, you should never see this.',
							subtitle: `"${location.pathname}" tried telling fly to replay your request and missed this one.`,
							image: <Grimmacing className="rounded-lg" aspectRatio="3:4" />,
							action: <ArrowLink href="/">Go home</ArrowLink>,
						}}
					/>
				</ErrorDoc>
			)
		}
		if (error.status !== 500) {
			return (
				<ErrorDoc>
					<ErrorPage
						heroProps={{
							title: `${error.status} - Oh no, something did not go well.`,
							subtitle: `"${location.pathname}" is currently not working. So sorry.`,
							image: <Grimmacing className="rounded-lg" aspectRatio="3:4" />,
							action: <ArrowLink href="/">Go home</ArrowLink>,
						}}
					/>
				</ErrorDoc>
			)
		}
		throw new Error(`Unhandled error: ${error.status}`)
	}

	console.error(error)
	return (
		<ErrorDoc>
			<ErrorPage
				heroProps={{
					title: '500 - Oh no, something did not go well.',
					subtitle: `"${location.pathname}" is currently not working. So sorry.`,
					image: <Grimmacing className="rounded-lg" aspectRatio="3:4" />,
					action: <ArrowLink href="/">Go home</ArrowLink>,
				}}
			/>
		</ErrorDoc>
	)
}

function kcdLiveReloadConnect(config?: { onOpen: () => void }) {
	const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
	const host = location.hostname
	const port = location.port
	const socketPath = `${protocol}//${host}:${port}/__ws`
	const ws = new WebSocket(socketPath)
	ws.onmessage = (message) => {
		const event = JSON.parse(message.data)
		if (
			event.type === 'kentcdodds.com:file-change' &&
			event.data.relativePath === location.pathname
		) {
			window.location.reload()
		}
	}
	ws.onopen = () => {
		if (config && typeof config.onOpen === 'function') {
			config.onOpen()
		}
	}
	ws.onclose = (event) => {
		if (event.code === 1006) {
			console.log(
				'kentcdodds.com dev server web socket closed. Reconnecting...',
			)
			setTimeout(
				() =>
					kcdLiveReloadConnect({
						onOpen: () => window.location.reload(),
					}),
				1000,
			)
		}
	}
	ws.onerror = (error) => {
		console.log('kentcdodds.com dev server web socket error:')
		console.error(error)
	}
}

function getWebsocketJS() {
	const js = /* javascript */ `
  ${kcdLiveReloadConnect.toString()}
  kcdLiveReloadConnect();
  `
	return js
}

/*
eslint
  @typescript-eslint/no-use-before-define: "off",
*/
