import * as React from 'react'
import {Meta, Scripts, Styles, Routes} from '@remix-run/react'

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Styles />
      </head>
      {/* tailwind variants need a class name here */}
      <body className="text-green-900 bg-gray-100 dark:bg-gray-800 dark:text-green-300">
        <Routes />
        <Scripts />
        <footer className="pt-20 pb-8 text-center">
          <p>This is a fun little remix project by Kent</p>
        </footer>
      </body>
    </html>
  )
}
