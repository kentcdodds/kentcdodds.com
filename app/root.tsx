import * as React from 'react'
import {Links, Meta, Scripts, LiveReload, usePendingLocation} from 'remix'
import type {LinksFunction} from 'remix'
import {useLocation, Outlet} from 'react-router-dom'
import styles from './styles/app.css'
import tailwind from './styles/tailwind.css'
import {useTheme, ThemeProvider} from './theme-provider'

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
    {
      rel: 'stylesheet',
      type: 'text/css',
      href:
        'https://unpkg.com/syntax-highlighting@1.0.0/assets/css/prism/prism-base16-tomorrow.light.css',
      media: '(prefers-color-scheme: light)',
    },
    {
      rel: 'stylesheet',
      type: 'text/css',
      href:
        'https://unpkg.com/prism-themes@1.5.0/themes/prism-vsc-dark-plus.css',
      media: '(prefers-color-scheme: dark)',
    },
  ]
}

function App() {
  const [theme] = useTheme()
  const location = useLocation()
  const pendingLocation = usePendingLocation()
  const includeTweets = location.pathname.includes('/blog/')
  return (
    <html lang="en" className={theme}>
      <head>
        <Meta />
        <Links />
      </head>
      <body
        className={`text-green-900 bg-gray-100 dark:bg-gray-800 dark:text-green-300 ${
          pendingLocation ? 'opacity-50' : ''
        }`}
      >
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
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )
}
