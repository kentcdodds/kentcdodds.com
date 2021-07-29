import './bootstrap.client'
import * as React from 'react'
import ReactDOM from 'react-dom'
import {load} from 'fathom-client'
import {RemixBrowser as Remix} from 'remix'

ReactDOM.hydrate(<Remix />, document)

if (ENV.NODE_ENV !== 'development') {
  load('HJUUDKMT', {
    // TODO: update this to the kentcdodds.com domain
    // url: 'https://sailfish.kentcdodds.com/script.js',
    url: 'https://aardvark.kent.dev/script.js',
    spa: 'history',
    excludedDomains: ['localhost'],
  })
}
