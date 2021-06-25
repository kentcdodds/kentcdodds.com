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
import {UserProvider} from './utils/misc'
import {getEnv} from './utils/env.server'

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
    {rel: 'stylesheet', href: tailwind},
    {rel: 'stylesheet', href: styles},
  ]
}

type LoaderData = {
  user: User | null
  theme: 'dark' | 'light' | null
  ENV: typeof global.ENV
}

export const loader: LoaderFunction = async ({request}) => {
  const user = await getUser(request)
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const data: LoaderData = {
    user,
    theme: session.get(sessionKey),
    ENV: getEnv(),
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
        // TODO: switch this to clsx when Stephan's PR that adds it is merged
        className={[showPendingState ? 'opacity-50' : null, theme]
          .filter(Boolean)
          .join(' ')}
      >
        <script
          // NOTE: this *has* to be set to the data.theme for the JS to be
          // consistent between the client and the server.
          dangerouslySetInnerHTML={{__html: getClientThemeCode(data.theme)}}
        />
        <Outlet />
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
    <UserProvider user={data.user}>
      <ThemeProvider specifiedTheme={data.theme}>
        <App />
      </ThemeProvider>
    </UserProvider>
  )
}
