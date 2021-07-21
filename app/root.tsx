import * as React from 'react'
import {
  Links,
  Meta,
  Scripts,
  LiveReload,
  usePendingLocation,
  LoaderFunction,
  json,
  useRouteData,
} from 'remix'
import type {LinksFunction, MetaFunction, Session} from 'remix'
import {useLocation, Outlet} from 'react-router-dom'
import clsx from 'clsx'
import type {Await, User} from 'types'
import tailwindStyles from './styles/tailwind.css'
import vendorStyles from './styles/vendors.css'
import appStyles from './styles/app.css'
import proseStyles from './styles/prose.css'
import {
  useTheme,
  ThemeProvider,
  sessionKey,
  Theme,
  NonFlashOfWrongThemeEls,
} from './utils/theme-provider'
import {getUser, rootStorage, sessionKeys} from './utils/session.server'
import {getDomainUrl} from './utils/misc'
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
  theme: Theme | null
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
      // the link is not active
      session.unset(sessionKeys.magicLink)
    }
  }
  return {email: session.get(sessionKeys.email), hasActiveMagicLink}
}

export const loader: LoaderFunction = async ({request}) => {
  const user = await getUser(request)

  const session = await rootStorage.getSession(request.headers.get('Cookie'))

  const data: LoaderData = {
    user,
    userInfo: user ? await getUserInfo(user) : null,
    theme: session.get(sessionKey),
    ENV: getEnv(),
    requestInfo: {
      origin: getDomainUrl(request),
      searchParams: new URL(request.url).searchParams.toString(),
      session: await getSessionInfo(session),
    },
  }

  return json(data, {
    headers: {'Set-Cookie': await rootStorage.commitSession(session)},
  })
}

function App() {
  const data = useRouteData<LoaderData>()
  const [team] = useTeam()
  const [theme] = useTheme()
  const location = useLocation()
  const pendingLocation = usePendingLocation()
  const showPendingState = pendingLocation
  const includeTweets = location.pathname.includes('/blog/')

  return (
    <html lang="en" className={theme ?? ''}>
      <head>
        <Meta />
        <Links />
        <style>{`
          :root {
            --color-team-current: var(--color-team-${team.toLowerCase()}); 
          }
        `}</style>
        <NonFlashOfWrongThemeEls ssrTheme={Boolean(data.theme)} />
      </head>
      <body
        className={clsx('dark:bg-gray-900 bg-white ', {
          'opacity-50': showPendingState,
        })}
        style={{
          // we want a transition delay, but only on the opacity transition
          // I'm unaware of any easy way to do this with tailwind
          // so we'll just do this with inline styles 🙃
          // TODO: maybe come up with a better way to show the pending state
          transition: 'opacity 0.5s linear 0.5s',
        }}
      >
        <Navbar />
        <main>
          <Outlet />
        </main>
        <Spacer size="medium" />
        <Footer />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data.ENV)};`,
          }}
        />
        {includeTweets ? (
          <script
            async
            src="https://platform.twitter.com/widgets.js"
            charSet="utf-8"
          />
        ) : null}
        {process.env.NODE_ENV === 'development' && <LiveReload />}
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
            <ThemeProvider specifiedTheme={data.theme}>
              <App />
            </ThemeProvider>
          </TeamProvider>
        </UserInfoProvider>
      </UserProvider>
    </RequestInfoProvider>
  )
}
