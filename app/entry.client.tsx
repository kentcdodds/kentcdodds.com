import './bootstrap.client'
import * as React from 'react'
import ReactDOM from 'react-dom'
import {load} from 'fathom-client'
import {RemixBrowser as Remix} from '@remix-run/react'

ReactDOM.hydrate(<Remix />, document)

if (ENV.NODE_ENV !== 'development') {
  load('HJUUDKMT', {
    url: 'https://sailfish.kentcdodds.com/script.js',
    spa: 'history',
    excludedDomains: ['localhost'],
  })
}
