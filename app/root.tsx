import * as React from 'react'
import {
  Headers,
  Links,
  Meta,
  Scripts,
  LiveReload,
  LoaderFunction,
  json,
  useLoaderData,
  useMatches,
  useTransition,
} from 'remix'
import type {
  LinksFunction,
  MetaFunction,
  HeadersFunction,
  HeadersInit,
} from 'remix'
import {Outlet} from 'react-router-dom'
import {AnimatePresence, motion} from 'framer-motion'
import {useSpinDelay} from 'spin-delay'
import type {Await, KCDHandle, User} from 'types'
import tailwindStyles from './styles/tailwind.css'
import vendorStyles from './styles/vendors.css'
import appStyles from './styles/app.css'
import proseStyles from './styles/prose.css'
import {
  useTheme,
  ThemeProvider,
  NonFlashOfWrongThemeEls,
} from './utils/theme-provider'
import {getThemeSession} from './utils/theme.server'
import {getSession} from './utils/session.server'
import {getLoginInfoSession} from './utils/login.server'
import {getDomainUrl, typedBoolean} from './utils/misc'
import {
  RequestInfo,
  UserInfoProvider,
  UserProvider,
  RequestInfoProvider,
  TeamProvider,
  useTeam,
} from './utils/providers'
import {getEnv} from './utils/env.server'
import {getUserInfo} from './utils/user-info.server'
import {getClientSession} from './utils/client.server'
import type {Timings} from './utils/metrics.server'
import {time, getServerTimeHeader} from './utils/metrics.server'
import {validateMagicLink} from './utils/prisma.server'
import {useScrollRestoration} from './utils/scroll'
import {Navbar} from './components/navbar'
import {Spacer} from './components/spacer'
import {Footer} from './components/footer'
import {TeamCircle} from './components/team-circle'
import {NotificationMessage} from './components/notification-message'

export const meta: MetaFunction = () => {
  return {
    // TODO: remove this when we're ready to launch
    robots: 'noindex',
    title: 'Kent C. Dodds',
    description:
      'Come check out how Kent C. Dodds can help you level up your career as a software engineer.',
    viewport: 'width=device-width,initial-scale=1,viewport-fit=cover',
    charSet: 'utf-8',
    'theme-color': '#A9ADC1',
    'twitter:widgets:autoload': 'off',
  }
}

export const links: LinksFunction = () => {
  return [
    {
      rel: 'preload',
      as: 'font',
      href: '/fonts/Matter-Medium.woff2',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'preload',
      as: 'font',
      href: '/fonts/Matter-Regular.woff2',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'preload',
      as: 'font',
      href: '/fonts/Matter-Medium.woff',
      type: 'font/woff',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'preload',
      as: 'font',
      href: '/fonts/Matter-Regular.woff',
      type: 'font/woff',
      crossOrigin: 'anonymous',
    },
    {rel: 'icon', href: '/favicon.ico'},
    {rel: 'stylesheet', href: vendorStyles},
    {rel: 'stylesheet', href: tailwindStyles},
    {rel: 'stylesheet', href: proseStyles},
    {rel: 'stylesheet', href: appStyles},
  ]
}

type LoaderData = {
  user: User | null
  userInfo: Await<ReturnType<typeof getUserInfo>> | null
  ENV: ReturnType<typeof getEnv>
  requestInfo: RequestInfo
}

export const loader: LoaderFunction = async ({request}) => {
  const timings: Timings = {}
  const session = await getSession(request)
  const themeSession = await getThemeSession(request)
  const clientSession = await getClientSession(request)
  const {getMagicLink, getEmail} = await getLoginInfoSession(request)

  const user = await time({
    name: 'getUser in root loader',
    type: 'postgres read',
    timings,
    fn: () => session.getUser(),
  })

  const magicLink = getMagicLink()
  let hasActiveMagicLink = false
  if (typeof magicLink === 'string') {
    try {
      await validateMagicLink(magicLink)
      hasActiveMagicLink = true
    } catch {
      // TODO: should we update the cookie to remove the magic link here?
      // trouble is we could get into a race condition where the root loader
      // says we need to commit a cookie, but then another loader running in
      // parallel says we need to commit a cookie as well and whichever finishes
      // last wins.
      // so for now, we'll just ignore the error
    }
  }

  const data: LoaderData = {
    user,
    userInfo: user
      ? await time({
          name: 'getUserInfo in root loader',
          type: 'convertkit and discord read',
          timings,
          fn: () => getUserInfo(user, {request, timings}),
        })
      : null,
    ENV: getEnv(),
    requestInfo: {
      origin: getDomainUrl(request),
      searchParams: new URL(request.url).searchParams.toString(),
      session: {
        email: getEmail(),
        hasActiveMagicLink,
        theme: themeSession.getTheme(),
      },
    },
  }

  const headers: HeadersInit = new Headers()
  headers.append('Server-Timing', getServerTimeHeader(timings))
  // this can lead to race conditions if a child route is also trying to commit
  // the cookie as well. This is a bug in remix that will hopefully be fixed.
  // we reduce the likelihood of a problem by only committing if the value is
  // different.
  await session.getHeaders(headers)
  await clientSession.getHeaders(headers)

  return json(data, {headers})
}

export const headers: HeadersFunction = ({loaderHeaders}) => {
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
  const transition = useTransition()
  const [words, setWords] = React.useState<Array<string>>([])
  const [pendingPath, setPendingPath] = React.useState('')
  const showLoader = useSpinDelay(Boolean(transition.state !== 'idle'), {
    delay: 400,
    minDuration: 1000,
  })

  React.useEffect(() => {
    if (firstRender) return
    if (transition.state === 'idle') return
    if (transition.state === 'loading') setWords(LOADER_WORDS)
    if (transition.state === 'submitting') setWords(ACTION_WORDS)

    const interval = setInterval(() => {
      setWords(([first, ...rest]) => [...rest, first] as Array<string>)
    }, 2000)

    return () => clearInterval(interval)
  }, [pendingPath, transition.state])

  React.useEffect(() => {
    if (firstRender) return
    if (transition.state === 'idle') return
    setPendingPath(transition.nextLocation.pathname)
  }, [transition])

  React.useEffect(() => {
    firstRender = false
  }, [])

  const action = words[0]

  return (
    <NotificationMessage position="bottom-right" visible={showLoader}>
      <div className="flex items-center w-64">
        <motion.div
          transition={{repeat: Infinity, duration: 2, ease: 'linear'}}
          animate={{rotate: 360}}
        >
          <TeamCircle size={48} team="UNKNOWN" />
        </motion.div>
        <div className="inline-grid ml-4">
          <AnimatePresence>
            <div className="flex col-start-1 row-start-1 overflow-hidden">
              <motion.span
                key={action}
                initial={{y: 15, opacity: 0}}
                animate={{y: 0, opacity: 1}}
                exit={{y: -15, opacity: 0}}
                transition={{duration: 0.25}}
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

function App() {
  const matches = useMatches()

  const metas = matches
    .flatMap(({handle}) => (handle as KCDHandle | undefined)?.metas)
    .filter(typedBoolean)
  const shouldManageScroll = matches.every(
    ({handle}) => (handle as KCDHandle | undefined)?.scroll !== false,
  )
  useScrollRestoration(shouldManageScroll)

  const data = useLoaderData<LoaderData>()
  const [team] = useTeam()
  const [theme] = useTheme()

  return (
    <html lang="en" className={theme ?? ''}>
      <head>
        <Meta />
        {metas.map((m, i) => (
          <meta key={i} {...m} />
        ))}
        <Links />
        <style>{`
          :root {
            --color-team-current: var(--color-team-${team.toLowerCase()}); 
          }
        `}</style>
        <NonFlashOfWrongThemeEls
          ssrTheme={Boolean(data.requestInfo.session.theme)}
        />
      </head>
      <body className="dark:bg-gray-900 bg-white transition duration-500">
        <PageLoadingMessage />
        {ENV.NODE_ENV === 'development' ? null : (
          <NotificationMessage autoClose={false}>
            <span role="img" aria-label="wave">
              👋
            </span>{' '}
            Welcome to kent.dev. This site is{' '}
            <strong>currently under construction</strong> and when it&apos;s
            finished it will be hosted at kentcdodds.com. Until then, feel free
            to poke around! All the source code is available at{' '}
            <a
              className="underline"
              href="https://github.com/kentcdodds/remix-kentcdodds"
            >
              github.com/kentcdodds/remix-kentcdodds
            </a>
          </NotificationMessage>
        )}
        <NotificationMessage queryStringKey="message" />
        <Navbar />
        <Outlet />
        <Spacer size="medium" />
        <Footer />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data.ENV)};`,
          }}
        />
        {process.env.NODE_ENV === 'development' ? <LiveReload /> : null}
      </body>
    </html>
  )
}

export default function AppWithProviders() {
  const data = useLoaderData<LoaderData>()
  return (
    <RequestInfoProvider value={data.requestInfo}>
      <UserProvider value={data.user}>
        <UserInfoProvider value={data.userInfo}>
          <TeamProvider>
            <ThemeProvider specifiedTheme={data.requestInfo.session.theme}>
              <App />
            </ThemeProvider>
          </TeamProvider>
        </UserInfoProvider>
      </UserProvider>
    </RequestInfoProvider>
  )
}
