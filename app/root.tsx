import * as React from 'react'
import {Meta, Styles, Scripts} from '@remix-run/react'
import {useLocation, Outlet} from 'react-router-dom'
import {useTheme, ThemeProvider} from './theme-provider'

const noScriptPaths = new Set(['/'])

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

function App() {
  const [theme] = useTheme()
  const location = useLocation()
  const includeScripts = !noScriptPaths.has(location.pathname)
  return (
    <html lang="en" className={theme}>
      <head>
        <Meta />

        <link
          rel="alternate"
          href="/feed.xml"
          title="Feed"
          type="application/atom+xml"
        />
        <link rel="feed" href="/feed.xml" />
        <link
          rel="stylesheet"
          type="text/css"
          href="https://unpkg.com/@exampledev/new.css@1.1.3/new.css"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="https://unpkg.com/syntax-highlighting@1.0.0/assets/css/prism/prism-base16-tomorrow.light.css"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="https://unpkg.com/prism-themes@1.5.0/themes/prism-vsc-dark-plus.css"
          media="(prefers-color-scheme: dark)"
        />

        <Styles />
      </head>
      <body className="text-green-900 bg-gray-100 dark:bg-gray-800 dark:text-green-300">
        <Outlet />
        {/* there's little reason to include JS on a markdown blog */}
        {includeScripts ? <Scripts /> : null}
        <script
          async
          src="https://platform.twitter.com/widgets.js"
          charSet="utf-8"
        />
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
