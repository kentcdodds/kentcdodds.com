import {useEffect, useLayoutEffect, useRef} from 'react'
import {useLocation} from 'react-router-dom'
import {useTransition} from '@remix-run/react'

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

export function useScrollRestoration(enabled: boolean = true) {
  const positions = useRef<Map<string, number>>(new Map()).current
  const location = useLocation()
  const transition = useTransition()

  useEffect(() => {
    if (transition.state === 'loading') {
      positions.set(location.key, window.scrollY)
    }
  }, [transition.state, location, positions])

  useSSRLayoutEffect(() => {
    if (!enabled) return
    if (transition.state !== 'loading') return
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
  const transition = useTransition()

  useEffect(() => {
    if (!ref.current) return
    if (transition.state === 'loading') {
      positions.set(location.key, ref.current.scrollTop)
    }
  }, [transition.state, location, ref, positions])

  useSSRLayoutEffect(() => {
    if (!enabled) return
    if (transition.state !== 'loading') return
    if (!ref.current) return
    const y = positions.get(location.key)
    ref.current.scrollTo(0, y ?? 0)
  }, [transition.state, location, positions, ref])
}
