import * as React from 'react'
import {Meta, Styles, Routes} from '@remix-run/react'

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,viewport-fit=cover"
        />
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
        {/* <Scripts /> */}
      </body>
    </html>
  )
}
