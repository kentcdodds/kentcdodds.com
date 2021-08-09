import * as React from 'react'
import {useLocation} from 'react-router-dom'
import {useTransition} from '@remix-run/react'

let firstRender = true

const useSSRLayoutEffect =
  typeof window === 'undefined' ? () => {} : React.useLayoutEffect

if (
  typeof window !== 'undefined' &&
  window.history.scrollRestoration !== 'manual'
) {
  window.history.scrollRestoration = 'manual'
}

// shouldn't have to do it this way
// https://github.com/remix-run/remix/issues/240
type LocationState = undefined | {isSubmission: boolean}
export function useScrollRestoration(enabled: boolean = true) {
  const positions = React.useRef<Map<string, number>>(new Map()).current
  const location = useLocation()
  const isSubmission = (location.state as LocationState)?.isSubmission ?? false
  const transition = useTransition()

  React.useEffect(() => {
    if (isSubmission) return
    if (transition.state === 'loading') {
      positions.set(location.key, window.scrollY)
    }
  }, [transition.state, location.key, positions, isSubmission])

  useSSRLayoutEffect(() => {
    if (!enabled) return
    if (transition.state !== 'idle') return
    if (isSubmission) return
    // don't restore scroll on initial render
    if (firstRender) {
      firstRender = false
      return
    }
    const y = positions.get(location.key)
    window.scrollTo(0, y ?? 0)
  }, [transition.state, location.key, positions, isSubmission])
}

export function useElementScrollRestoration(
  ref: React.MutableRefObject<HTMLElement | null>,
  enabled: boolean = true,
) {
  const positions = React.useRef<Map<string, number>>(new Map()).current
  const location = useLocation()
  const transition = useTransition()

  React.useEffect(() => {
    if (!ref.current) return
    if (transition.state === 'loading') {
      positions.set(location.key, ref.current.scrollTop)
    }
  }, [transition.state, location.key, ref, positions])

  useSSRLayoutEffect(() => {
    if (!enabled) return
    if (transition.state !== 'idle') return
    if (!ref.current) return
    const y = positions.get(location.key)
    ref.current.scrollTo(0, y ?? 0)
  }, [transition.state, location.key, positions, ref])
}
