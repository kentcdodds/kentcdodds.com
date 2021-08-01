import {useEffect, useLayoutEffect, useRef} from 'react'
import {useLocation} from 'react-router-dom'
import {usePendingLocation} from '@remix-run/react'

let firstRender = true

const useSSRLayoutEffect =
  typeof window === 'undefined' ? () => {} : useLayoutEffect

// this is currently
if (
  typeof window !== 'undefined' &&
  window.history.scrollRestoration !== 'manual'
) {
  window.history.scrollRestoration = 'manual'
}

// there's a bug with this:
// https://github.com/remix-run/remix/issues/230
export function useScrollRestoration(enabled: boolean = true) {
  const positions = useRef<Map<string, number>>(new Map()).current
  const location = useLocation()
  const pendingLocation = usePendingLocation()

  useEffect(() => {
    if (pendingLocation) {
      positions.set(location.key, window.scrollY)
    }
  }, [pendingLocation, location, positions])

  useSSRLayoutEffect(() => {
    if (!enabled) return
    // don't restore scroll on initial render
    if (firstRender) {
      firstRender = false
      return
    }
    const y = positions.get(location.key)
    window.scrollTo(0, y ?? 0)
  }, [location, positions])
}

export function useElementScrollRestoration(
  ref: React.MutableRefObject<HTMLElement | null>,
  enabled: boolean = true,
) {
  const positions = useRef<Map<string, number>>(new Map()).current
  const location = useLocation()
  const pendingLocation = usePendingLocation()

  useEffect(() => {
    if (!ref.current) return
    if (pendingLocation) {
      positions.set(location.key, ref.current.scrollTop)
    }
  }, [pendingLocation, location, ref, positions])

  useSSRLayoutEffect(() => {
    if (!enabled) return
    if (!ref.current) return
    const y = positions.get(location.key)
    ref.current.scrollTo(0, y ?? 0)
  }, [location, positions, ref])
}
