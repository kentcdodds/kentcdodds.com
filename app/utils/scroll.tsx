import * as React from 'react'
import {useLocation} from 'react-router-dom'
import {useTransition} from '@remix-run/react'
import {useBeforeUnload} from 'remix'
import {useSSRLayoutEffect} from './misc'

let firstRender = true
let positions: {[key: string]: number} = {}
const SESSION_STORAGE_KEY = 'kody_scroll_positions'

if (typeof window !== 'undefined') {
  try {
    positions = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) ?? '{}')
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  }
}

// shouldn't have to do it this way
// https://github.com/remix-run/remix/issues/240
type LocationState = undefined | {isSubmission: boolean}
export function useScrollRestoration(enabled: boolean = true) {
  const location = useLocation()
  const latestLocationRef = React.useRef(location)
  React.useEffect(() => {
    latestLocationRef.current = location
  }, [location])
  const isSubmission = (location.state as LocationState)?.isSubmission ?? false
  const transition = useTransition()
  const hash =
    typeof window === 'undefined' ? location.hash : window.location.hash

  React.useEffect(() => {
    if (transition.location) {
      positions[location.key] = window.scrollY
    }
  }, [transition, location])

  useBeforeUnload(
    React.useCallback(() => {
      positions[latestLocationRef.current.key] = window.scrollY
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(positions))
    }, []),
  )

  useSSRLayoutEffect(() => {
    if (!enabled) return
    if (transition.state !== 'idle') return
    if (isSubmission) return
    // don't restore scroll on initial render
    if (firstRender) {
      firstRender = false
      return
    }

    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView({behavior: 'smooth'})
        return
      }
    }

    const y = positions[location.key]
    window.scrollTo(0, y ?? 0)
  }, [transition.state, location.key, hash, positions, isSubmission])
}

export function RestoreScrollPosition() {
  return (
    <script
      // restore scroll position ASAP:
      // doing it inline like this means scroll position will happen before the page is hyrdated
      // (or even if it's not).
      dangerouslySetInnerHTML={{
        __html: `
// yo, this code here ensures that you have a most excellent scroll management
// experience on the site. It's inline to make sure your scroll position is
// restored asap when refreshing or navigating back to the site using the back button
window.history.scrollRestoration = 'manual'
try {
  const positions = JSON.parse(sessionStorage.getItem(${JSON.stringify(
    SESSION_STORAGE_KEY,
  )}) ?? '{}')
  const storedY = positions[window.history.state.key]
  if (typeof storedY === 'number') {
    window.scrollTo(0, storedY)
  }
} catch {
  sessionStorage.removeItem('positions')
}
    `,
      }}
    />
  )
}
