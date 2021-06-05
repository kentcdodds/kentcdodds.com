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
import type {LinksFunction} from 'remix'
import {useLocation, Outlet} from 'react-router-dom'
import type {User} from 'types'
import styles from './styles/app.css'
import tailwind from './styles/tailwind.css'
import {useTheme, ThemeProvider} from './theme-provider'
import {optionalUser} from './utils/session.server'
import {UserProvider} from './utils/misc'

export function meta() {
  return {
    title: 'Kent C. Dodds',
    description:
      'Come check out how Kent C. Dodds can help you level up your career as a software engineer.',
    viewport: 'width=device-width,initial-scale=1,viewport-fit=cover',
    charSet: 'utf-8',
    'color-scheme': 'dark light',
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
}

export const loader: LoaderFunction = async ({request}) => {
  return optionalUser(request)(async user => {
    const data: LoaderData = {user}
    return json(data)
  })
}

function App() {
  const [theme] = useTheme()
  const location = useLocation()
  const pendingLocation = usePendingLocation()
  const showPendingState =
    pendingLocation &&
    new URLSearchParams(pendingLocation.search).get(
      'supressPendingIndicator',
    ) === 'true'
  const includeTweets = location.pathname.includes('/blog/')
  return (
    <html lang="en" className={theme}>
      <head>
        <Meta />
        <Links />
      </head>
      <body className={`${showPendingState ? 'opacity-50' : ''}`}>
        <Outlet />
        <Scripts />
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
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </UserProvider>
  )
}
