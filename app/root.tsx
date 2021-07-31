import * as React from 'react'
import {
  Links,
  Meta,
  Scripts,
  LiveReload,
  LoaderFunction,
  json,
  useRouteData,
  useMatches,
  usePendingLocation,
} from 'remix'
import type {LinksFunction, MetaFunction, Session} from 'remix'
import {Outlet} from 'react-router-dom'
import type {Await, KCDHandle, User} from 'types'
import tailwindStyles from './styles/tailwind.css'
import vendorStyles from './styles/vendors.css'
import appStyles from './styles/app.css'
import proseStyles from './styles/prose.css'
import {
  useTheme,
  ThemeProvider,
  sessionKey,
  NonFlashOfWrongThemeEls,
} from './utils/theme-provider'
import {getUser, rootStorage, sessionKeys} from './utils/session.server'
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
import {validateMagicLink} from './utils/prisma.server'
import {Navbar} from './components/navbar'
import {Spacer} from './components/spacer'
import {Footer} from './components/footer'
import {TeamCircle} from './components/team-circle'
import {NotificationMessage} from './components/notification-message'
import {AnimatePresence, motion} from 'framer-motion'
import {useSpinDelay} from 'spin-delay'

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

async function getSessionInfo(session: Session) {
  const magicLink = session.get(sessionKeys.magicLink)
  let hasActiveMagicLink = false
  if (typeof magicLink === 'string') {
    try {
      await validateMagicLink(magicLink)
      hasActiveMagicLink = true
    } catch {
      // ignore the error
    }
  }
  return {
    email: session.get(sessionKeys.email),
    hasActiveMagicLink,
    theme: session.get(sessionKey),
  }
}

export const loader: LoaderFunction = async ({request}) => {
  const user = await getUser(request)

  const session = await rootStorage.getSession(request.headers.get('Cookie'))

  const data: LoaderData = {
    user,
    userInfo: user ? await getUserInfo(user) : null,
    ENV: getEnv(),
    requestInfo: {
      origin: getDomainUrl(request),
      searchParams: new URL(request.url).searchParams.toString(),
      session: await getSessionInfo(session),
    },
  }

  return json(data)
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

function PageLoadingMessage() {
  const pending = usePendingLocation()
  const [words, setWords] = React.useState(LOADER_WORDS)
  const [pendingPath, setPendingPath] = React.useState('')
  const showLoader = useSpinDelay(Boolean(pending), {
    delay: 300,
    minDuration: 1000,
  })

  React.useEffect(() => {
    setWords(LOADER_WORDS)

    const interval = setInterval(() => {
      setWords(([first, ...rest]) => [...rest, first] as Array<string>)
    }, 2000)

    return () => clearInterval(interval)
  }, [pendingPath])

  React.useEffect(() => {
    if (!pending) return
    setPendingPath(pending.pathname)
  }, [pending])

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

  const data = useRouteData<LoaderData>()
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
  const data = useRouteData<LoaderData>()
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
