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
import type {LinksFunction, MetaFunction} from 'remix'
import {useLocation, Outlet} from 'react-router-dom'
import clsx from 'clsx'
import type {Await, User} from 'types'
import tailwind from './styles/tailwind.css'
import vendors from './styles/vendors.css'
import styles from './styles/app.css'
import {
  useTheme,
  ThemeProvider,
  sessionKey,
  Theme,
  NonFlashOfWrongThemeEls,
} from './theme-provider'
import {getUser, rootStorage} from './utils/session.server'
import {
  RequestInfo,
  UserInfoProvider,
  UserProvider,
  getDomainUrl,
  RequestInfoProvider,
} from './utils/misc'
import {getEnv} from './utils/env.server'
import {getUserInfo} from './utils/user-info.server'
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
    {rel: 'stylesheet', href: vendors},
    {rel: 'stylesheet', href: tailwind},
    {rel: 'stylesheet', href: styles},
  ]
}

type LoaderData = {
  user: User | null
  userInfo: Await<ReturnType<typeof getUserInfo>> | null
  theme: Theme | null
  ENV: typeof global.ENV
  requestInfo: RequestInfo
}

export const loader: LoaderFunction = async ({request}) => {
  const user = await getUser(request)
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const data: LoaderData = {
    user,
    userInfo: user ? await getUserInfo(user) : null,
    theme: session.get(sessionKey),
    ENV: getEnv(),
    requestInfo: {origin: getDomainUrl(request)},
  }
  return json(data)
}

function App() {
  const data = useRouteData<LoaderData>()
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
        <NonFlashOfWrongThemeEls ssrTheme={Boolean(data.theme)} />
      </head>
      <body
        className={clsx('dark:bg-gray-900 bg-white transition', {
          'opacity-50': showPendingState,
        })}
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
          <ThemeProvider specifiedTheme={data.theme}>
            <App />
          </ThemeProvider>
        </UserInfoProvider>
      </UserProvider>
    </RequestInfoProvider>
  )
}
