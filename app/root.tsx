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
import type {User} from 'types'
import styles from './styles/app.css'
import tailwind from './styles/tailwind.css'
import {
  useTheme,
  ThemeProvider,
  getClientThemeCode,
  getThemeFromMedia,
  sessionKey,
} from './theme-provider'
import {getUser, rootStorage} from './utils/session.server'
import type {RequestInfo} from './utils/misc'
import {UserProvider, getDomainUrl, RequestInfoProvider} from './utils/misc'
import {getEnv} from './utils/env.server'
import {Navbar} from './components/navbar'
import {Spacer} from './components/spacer'
import {Footer} from './components/footer'
import clsx from 'clsx'

export const meta: MetaFunction = ({data}: {data: LoaderData}) => {
  const theme = getThemeFromMedia(data.theme)

  return {
    title: 'Kent C. Dodds',
    description:
      'Come check out how Kent C. Dodds can help you level up your career as a software engineer.',
    viewport: 'width=device-width,initial-scale=1,viewport-fit=cover',
    charSet: 'utf-8',
    'theme-color': '#A9ADC1',
    'color-scheme':
      theme === 'dark'
        ? 'dark light'
        : theme === 'light'
        ? 'light dark'
        : 'normal',
    'twitter:widgets:autoload': 'off',
  }
}

export const links: LinksFunction = () => {
  return [
    {rel: 'icon', href: '/favicon.ico'},
    {rel: 'stylesheet', href: styles},
    {rel: 'stylesheet', href: tailwind},
  ]
}

type LoaderData = {
  user: User | null
  theme: 'dark' | 'light' | null
  ENV: typeof global.ENV
  requestInfo: RequestInfo
}

export const loader: LoaderFunction = async ({request}) => {
  const user = await getUser(request)
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const data: LoaderData = {
    user,
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
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body
        className={clsx(
          'transition',
          {
            'opacity-50': showPendingState,
            'bg-gray-900': theme === 'dark',
            'bg-white': theme === 'light',
          },
          theme,
        )}
      >
        <script
          // NOTE: this *has* to be set to the data.theme for the JS to be
          // consistent between the client and the server.
          dangerouslySetInnerHTML={{__html: getClientThemeCode(data.theme)}}
        />
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
    <RequestInfoProvider info={data.requestInfo}>
      <UserProvider user={data.user}>
        <ThemeProvider specifiedTheme={data.theme}>
          <App />
        </ThemeProvider>
      </UserProvider>
    </RequestInfoProvider>
  )
}
