import * as React from 'react'
import {Meta, Styles, Routes, Scripts} from '@remix-run/react'
import {useLocation} from 'react-router-dom'
import {useTheme} from './theme-provider'

const noScriptPaths = new Set(['/'])

function App() {
  const [theme] = useTheme()
  const location = useLocation()
  const includeScripts = !noScriptPaths.has(location.pathname)
  return (
    <html lang="en" className={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,viewport-fit=cover"
        />
        <meta name="twitter:widgets:autoload" content="off" />
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
        <Routes />
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

export default App
